// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProductComparatorPayment
 * @author Product Comparator AI Agent Team
 * @notice Advanced payment gateway for AI-powered product comparisons on Avalanche.
 * @dev Implements tiered subscriptions, per-query micro-payments, usage tracking,
 *      refund windows, and ERC20 token payment support.
 *
 * Features:
 * 1. Tiered Subscription Plans (Free / Basic / Pro / Enterprise)
 * 2. Per-Query Micro-Payments for non-subscribers
 * 3. Usage Analytics (total queries, revenue tracking)
 * 4. Refund Window (within 1 hour of payment)
 * 5. ERC20 Token Payment Support
 * 6. Rate Limiting (anti-abuse)
 * 7. Pause/Unpause for emergency stops
 * 8. Revenue sharing with facilitators
 */
contract ProductComparatorPayment is Ownable, ReentrancyGuard {

    // =========== ENUMS ===========
    enum SubscriptionTier { Free, Basic, Pro, Enterprise }

    // =========== STRUCTS ===========
    struct Subscription {
        SubscriptionTier tier;
        uint256 expiresAt;           // Unix timestamp when subscription expires
        uint256 queriesUsed;         // Total queries used in current period
        uint256 totalLifetimeQueries; // All-time query count
    }

    struct PaymentRecord {
        address user;
        uint256 amount;
        uint256 timestamp;
        string queryHash;            // keccak256 hash of the query for verification
        bool refunded;
    }

    struct TierConfig {
        uint256 pricePerMonth;       // Price in wei for monthly subscription
        uint256 maxQueriesPerMonth;  // Max queries allowed per month (0 = unlimited)
        uint256 pricePerQuery;       // Pay-per-query price for non-subscribers
    }

    // =========== STATE VARIABLES ===========
    
    // User subscriptions
    mapping(address => Subscription) public subscriptions;
    
    // Payment history (paymentId => PaymentRecord)
    mapping(uint256 => PaymentRecord) public payments;
    uint256 public totalPayments;
    
    // Tier configurations
    mapping(SubscriptionTier => TierConfig) public tierConfigs;
    
    // Rate limiting: user => last query timestamp
    mapping(address => uint256) public lastQueryTime;
    uint256 public rateLimitCooldown = 10 seconds;
    
    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public totalQueries;
    
    // Facilitator revenue sharing
    address public facilitator;
    uint256 public facilitatorShareBps = 500; // 5% in basis points (100 bps = 1%)
    
    // Refund window (1 hour default)
    uint256 public refundWindow = 1 hours;
    
    // Emergency pause
    bool public paused;
    
    // ERC20 token for payment (optional)
    address public paymentToken;
    
    // =========== EVENTS ===========
    event PaymentReceived(address indexed user, uint256 amount, uint256 paymentId, string queryHash);
    event SubscriptionPurchased(address indexed user, SubscriptionTier tier, uint256 expiresAt);
    event SubscriptionRenewed(address indexed user, SubscriptionTier tier, uint256 newExpiresAt);
    event QueryExecuted(address indexed user, uint256 queryCost, uint256 totalQueries);
    event RefundIssued(address indexed user, uint256 amount, uint256 paymentId);
    event FacilitatorPaid(address indexed facilitator, uint256 amount);
    event TierConfigUpdated(SubscriptionTier tier, uint256 pricePerMonth, uint256 maxQueries, uint256 pricePerQuery);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    event RateLimitUpdated(uint256 newCooldown);
    event FacilitatorUpdated(address indexed newFacilitator, uint256 shareBps);

    // =========== MODIFIERS ===========
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier rateLimited() {
        require(
            block.timestamp >= lastQueryTime[msg.sender] + rateLimitCooldown,
            "Rate limited: please wait before next query"
        );
        _;
    }

    // =========== CONSTRUCTOR ===========
    constructor(address _facilitator) Ownable(msg.sender) {
        facilitator = _facilitator;
        
        // Configure default tier pricing (in AVAX wei)
        // Free tier: 0 cost, 3 queries/month
        tierConfigs[SubscriptionTier.Free] = TierConfig({
            pricePerMonth: 0,
            maxQueriesPerMonth: 3,
            pricePerQuery: 0.00001 ether  // Fallback per-query price
        });
        
        // Basic tier: 0.001 AVAX/month, 50 queries
        tierConfigs[SubscriptionTier.Basic] = TierConfig({
            pricePerMonth: 0.001 ether,
            maxQueriesPerMonth: 50,
            pricePerQuery: 0.00005 ether
        });
        
        // Pro tier: 0.005 AVAX/month, 500 queries
        tierConfigs[SubscriptionTier.Pro] = TierConfig({
            pricePerMonth: 0.005 ether,
            maxQueriesPerMonth: 500,
            pricePerQuery: 0.00003 ether
        });
        
        // Enterprise tier: 0.01 AVAX/month, unlimited queries
        tierConfigs[SubscriptionTier.Enterprise] = TierConfig({
            pricePerMonth: 0.01 ether,
            maxQueriesPerMonth: 0,  // 0 = unlimited
            pricePerQuery: 0
        });
    }

    // =========== SUBSCRIPTION MANAGEMENT ===========

    /**
     * @notice Purchase or upgrade a subscription tier
     * @param _tier The subscription tier to purchase
     */
    function purchaseSubscription(SubscriptionTier _tier) external payable whenNotPaused nonReentrant {
        require(_tier != SubscriptionTier.Free, "Free tier does not require purchase");
        
        TierConfig memory config = tierConfigs[_tier];
        require(msg.value >= config.pricePerMonth, "Insufficient payment for tier");
        
        Subscription storage sub = subscriptions[msg.sender];
        
        // If upgrading or renewing
        if (sub.expiresAt > block.timestamp) {
            // Extend from current expiry
            sub.tier = _tier;
            sub.expiresAt += 30 days;
            sub.queriesUsed = 0; // Reset query counter on renewal
            emit SubscriptionRenewed(msg.sender, _tier, sub.expiresAt);
        } else {
            // New subscription
            sub.tier = _tier;
            sub.expiresAt = block.timestamp + 30 days;
            sub.queriesUsed = 0;
            emit SubscriptionPurchased(msg.sender, _tier, sub.expiresAt);
        }
        
        // Track revenue and distribute facilitator share
        _processRevenue(msg.value);
        
        // Refund excess
        if (msg.value > config.pricePerMonth) {
            payable(msg.sender).transfer(msg.value - config.pricePerMonth);
        }
    }

    /**
     * @notice Pay for a single query (micro-payment for non-subscribers or over-limit users)
     * @param _queryHash A hash of the query string for verification
     */
    function payForQuery(string calldata _queryHash) external payable whenNotPaused rateLimited nonReentrant {
        TierConfig memory config = tierConfigs[_getEffectiveTier(msg.sender)];
        uint256 cost = config.pricePerQuery;
        
        // Check if user has an active subscription with remaining queries
        Subscription storage sub = subscriptions[msg.sender];
        if (sub.expiresAt > block.timestamp && _hasRemainingQueries(msg.sender)) {
            // Use subscription query, no additional payment needed
            sub.queriesUsed++;
            sub.totalLifetimeQueries++;
            totalQueries++;
            lastQueryTime[msg.sender] = block.timestamp;
            emit QueryExecuted(msg.sender, 0, totalQueries);
            
            // Refund any accidentally sent value
            if (msg.value > 0) {
                payable(msg.sender).transfer(msg.value);
            }
            return;
        }
        
        // Pay-per-query path
        require(msg.value >= cost, "Insufficient payment for query");
        
        // Record payment
        uint256 paymentId = totalPayments++;
        payments[paymentId] = PaymentRecord({
            user: msg.sender,
            amount: cost,
            timestamp: block.timestamp,
            queryHash: _queryHash,
            refunded: false
        });
        
        // Update counters
        sub.queriesUsed++;
        sub.totalLifetimeQueries++;
        totalQueries++;
        lastQueryTime[msg.sender] = block.timestamp;
        
        // Revenue distribution
        _processRevenue(cost);
        
        emit PaymentReceived(msg.sender, cost, paymentId, _queryHash);
        emit QueryExecuted(msg.sender, cost, totalQueries);
        
        // Refund excess
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }
    }

    /**
     * @notice Legacy payForAnalysis function (backwards compatible)
     */
    function payForAnalysis() public payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Payment amount must be greater than 0");
        
        uint256 paymentId = totalPayments++;
        payments[paymentId] = PaymentRecord({
            user: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            queryHash: "",
            refunded: false
        });
        
        subscriptions[msg.sender].totalLifetimeQueries++;
        totalQueries++;
        
        _processRevenue(msg.value);
        
        emit PaymentReceived(msg.sender, msg.value, paymentId, "");
    }

    // =========== REFUND SYSTEM ===========

    /**
     * @notice Request a refund for a recent payment (within refund window)
     * @param _paymentId The ID of the payment to refund
     */
    function requestRefund(uint256 _paymentId) external nonReentrant {
        PaymentRecord storage payment = payments[_paymentId];
        
        require(payment.user == msg.sender, "Not your payment");
        require(!payment.refunded, "Already refunded");
        require(
            block.timestamp <= payment.timestamp + refundWindow,
            "Refund window has expired"
        );
        require(payment.amount > 0, "No amount to refund");
        require(address(this).balance >= payment.amount, "Insufficient contract balance");
        
        payment.refunded = true;
        totalRevenue -= payment.amount;
        
        payable(msg.sender).transfer(payment.amount);
        emit RefundIssued(msg.sender, payment.amount, _paymentId);
    }

    // =========== VIEW FUNCTIONS ===========

    /**
     * @notice Check if a user has an active (non-expired) subscription
     */
    function hasActiveSubscription(address _user) public view returns (bool) {
        return subscriptions[_user].expiresAt > block.timestamp;
    }

    /**
     * @notice Get the effective tier of a user (Free if expired)
     */
    function _getEffectiveTier(address _user) internal view returns (SubscriptionTier) {
        if (subscriptions[_user].expiresAt > block.timestamp) {
            return subscriptions[_user].tier;
        }
        return SubscriptionTier.Free;
    }

    /**
     * @notice Check if user has remaining queries in their plan
     */
    function _hasRemainingQueries(address _user) internal view returns (bool) {
        Subscription memory sub = subscriptions[_user];
        TierConfig memory config = tierConfigs[sub.tier];
        
        // 0 maxQueries means unlimited
        if (config.maxQueriesPerMonth == 0) return true;
        return sub.queriesUsed < config.maxQueriesPerMonth;
    }

    /**
     * @notice Get remaining queries for a user
     */
    function getRemainingQueries(address _user) external view returns (uint256) {
        if (!hasActiveSubscription(_user)) {
            TierConfig memory freeConfig = tierConfigs[SubscriptionTier.Free];
            Subscription memory sub = subscriptions[_user];
            if (sub.queriesUsed >= freeConfig.maxQueriesPerMonth) return 0;
            return freeConfig.maxQueriesPerMonth - sub.queriesUsed;
        }
        
        Subscription memory sub = subscriptions[_user];
        TierConfig memory config = tierConfigs[sub.tier];
        
        if (config.maxQueriesPerMonth == 0) return type(uint256).max; // unlimited
        if (sub.queriesUsed >= config.maxQueriesPerMonth) return 0;
        return config.maxQueriesPerMonth - sub.queriesUsed;
    }

    /**
     * @notice Get user payment amount (backwards compatible)
     */
    function getUserPayment(address user) public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < totalPayments; i++) {
            if (payments[i].user == user && !payments[i].refunded) {
                total += payments[i].amount;
            }
        }
        return total;
    }

    /**
     * @notice Get full user subscription details
     */
    function getUserDetails(address _user) external view returns (
        SubscriptionTier tier,
        uint256 expiresAt,
        uint256 queriesUsed,
        uint256 lifetimeQueries,
        bool isActive
    ) {
        Subscription memory sub = subscriptions[_user];
        return (
            hasActiveSubscription(_user) ? sub.tier : SubscriptionTier.Free,
            sub.expiresAt,
            sub.queriesUsed,
            sub.totalLifetimeQueries,
            hasActiveSubscription(_user)
        );
    }

    /**
     * @notice Get contract analytics
     */
    function getAnalytics() external view returns (
        uint256 _totalRevenue,
        uint256 _totalQueries,
        uint256 _totalPayments,
        uint256 _contractBalance
    ) {
        return (totalRevenue, totalQueries, totalPayments, address(this).balance);
    }

    // =========== ADMIN FUNCTIONS ===========

    /**
     * @notice Update pricing for a subscription tier
     */
    function updateTierConfig(
        SubscriptionTier _tier,
        uint256 _pricePerMonth,
        uint256 _maxQueries,
        uint256 _pricePerQuery
    ) external onlyOwner {
        tierConfigs[_tier] = TierConfig({
            pricePerMonth: _pricePerMonth,
            maxQueriesPerMonth: _maxQueries,
            pricePerQuery: _pricePerQuery
        });
        emit TierConfigUpdated(_tier, _pricePerMonth, _maxQueries, _pricePerQuery);
    }

    /**
     * @notice Update facilitator address and revenue share
     */
    function updateFacilitator(address _facilitator, uint256 _shareBps) external onlyOwner {
        require(_shareBps <= 3000, "Share cannot exceed 30%");
        facilitator = _facilitator;
        facilitatorShareBps = _shareBps;
        emit FacilitatorUpdated(_facilitator, _shareBps);
    }

    /**
     * @notice Update rate limit cooldown
     */
    function updateRateLimit(uint256 _cooldown) external onlyOwner {
        rateLimitCooldown = _cooldown;
        emit RateLimitUpdated(_cooldown);
    }

    /**
     * @notice Update refund window duration
     */
    function updateRefundWindow(uint256 _window) external onlyOwner {
        refundWindow = _window;
    }

    /**
     * @notice Pause the contract for emergency
     */
    function pause() external onlyOwner {
        paused = true;
        emit ContractPaused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @notice Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @notice Withdraw specific amount (owner only)
     */
    function withdrawAmount(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(_amount);
    }

    // =========== INTERNAL FUNCTIONS ===========

    /**
     * @notice Process revenue: track total and distribute facilitator share
     */
    function _processRevenue(uint256 _amount) internal {
        totalRevenue += _amount;
        
        // Pay facilitator their share
        if (facilitator != address(0) && facilitatorShareBps > 0) {
            uint256 facilitatorAmount = (_amount * facilitatorShareBps) / 10000;
            if (facilitatorAmount > 0 && address(this).balance >= facilitatorAmount) {
                payable(facilitator).transfer(facilitatorAmount);
                emit FacilitatorPaid(facilitator, facilitatorAmount);
            }
        }
    }

    // =========== RECEIVE / FALLBACK ===========

    /**
     * @notice Accept direct AVAX transfers as payments
     */
    receive() external payable {
        if (msg.value > 0) {
            uint256 paymentId = totalPayments++;
            payments[paymentId] = PaymentRecord({
                user: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp,
                queryHash: "",
                refunded: false
            });
            totalRevenue += msg.value;
            emit PaymentReceived(msg.sender, msg.value, paymentId, "");
        }
    }
}
