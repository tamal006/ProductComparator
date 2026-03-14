const axios = require('axios');

async function getYouTubeOpinions(query) {
  // Uses YouTube V3 API. If API key is not present, return mock data
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY') {
    return [
      { 
        title: `${query} Review - Is it worth it?`, 
        description: "In-depth comparison of features, camera and battery life.", 
        comments: ["Love the new display", "Too expensive for what it offers"] 
      }
    ];
  }

  try {
    const res = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        q: `${query} review`,
        key: apiKey,
        maxResults: 3,
        type: 'video'
      }
    });
    return res.data.items.map(item => ({
      title: item.snippet.title,
      description: item.snippet.description
    }));
  } catch (error) {
    console.error("YouTube API error:", error.message);
    return [];
  }
}

module.exports = { getYouTubeOpinions };
