// spotifyService.js
import SpotifyWebApi from 'spotify-web-api-node';

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const redirectUri = import.meta.env.VITE_REDIRECT_URI;

const spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri
});

export const refreshToken = async (refreshToken) => {
    spotifyApi.setRefreshToken(refreshToken);
    try {
        const data = await spotifyApi.refreshAccessToken();
        const accessToken = data.body['access_token'];
        spotifyApi.setAccessToken(accessToken);
        return accessToken;
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw error;
    }
};

export const getCurrentTrack = async () => {
    try {
        const response = await spotifyApi.getMyCurrentPlaybackState();
        if (response.statusCode === 204 || response.statusCode === 404) {
            return null;
        }
        if (response.statusCode === 403) {
            throw new Error('No active device found');
        }
        return response.body;
    } catch (error) {
        if (error.statusCode === 401) {
            throw new Error('Token expired');
        }
        console.error('Error getting current track:', error);
        throw error;
    }
};

export const togglePlayback = async (isPlaying) => {
    try {
        // Önce aktif cihazı kontrol et
        const state = await spotifyApi.getMyCurrentPlaybackState();
        if (!state.body?.device?.id) {
            throw new Error('No active device found');
        }

        if (isPlaying) {
            await spotifyApi.pause();
        } else {
            await spotifyApi.play();
        }
    } catch (error) {
        console.error('Error toggling playback:', error);
        throw error;
    }
};

export const skipToNext = async () => {
    try {
        await spotifyApi.skipToNext();
    } catch (error) {
        console.error('Error skipping to next:', error);
        throw error;
    }
};


export const getUserPlaylists = async () => {
    const token = localStorage.getItem('spotifyToken'); // Token'ı localStorage'dan alın
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status !== 200) {
        throw new Error('Failed to fetch playlists');
    }

    return response.data.items;
};


export const skipToPrevious = async () => {
    try {
        await spotifyApi.skipToPrevious();
    } catch (error) {
        console.error('Error skipping to previous:', error);
        throw error;
    }
};

export const seekToPosition = async (positionMs) => {
    try {
        await spotifyApi.seek(positionMs);
    } catch (error) {
        console.error('Error seeking position:', error);
        throw error;
    }
};

export const setAccessToken = (token) => {
    spotifyApi.setAccessToken(token);
};

export default spotifyApi;