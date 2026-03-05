import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    const { playlistId } = await req.json();
    if (!playlistId) {
      return new Response(JSON.stringify({ error: 'playlistId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract playlist ID from URL if full URL given
    let pid = playlistId;
    if (playlistId.includes('list=')) {
      const url = new URL(playlistId);
      pid = url.searchParams.get('list') || playlistId;
    }

    const videos: Array<{ videoId: string; title: string; thumbnail: string; position: number }> = [];
    let nextPageToken = '';

    do {
      const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(pid)}&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(`YouTube API error [${res.status}]: ${JSON.stringify(data)}`);
      }

      for (const item of data.items || []) {
        videos.push({
          videoId: item.snippet?.resourceId?.videoId || '',
          title: item.snippet?.title || 'Untitled',
          thumbnail: item.snippet?.thumbnails?.default?.url || '',
          position: item.snippet?.position ?? videos.length,
        });
      }

      nextPageToken = data.nextPageToken || '';
    } while (nextPageToken);

    // Get playlist title
    const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(pid)}&key=${YOUTUBE_API_KEY}`);
    const plData = await plRes.json();
    const playlistTitle = plData.items?.[0]?.snippet?.title || 'YouTube Playlist';

    return new Response(JSON.stringify({ 
      playlistTitle, 
      videos,
      totalVideos: videos.length,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('YouTube playlist error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
