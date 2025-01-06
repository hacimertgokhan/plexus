import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

const SpotifyPlayer = () => {
    const [token, setToken] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [volume, setVolume] = useState(50);
    const [deviceId, setDeviceId] = useState(null);

    const SPOTIFY_AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${import.meta.env.VITE_SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${import.meta.env.VITE_REDIRECT_URI}&scope=streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state app-remote-control streaming user-read-currently-playing`;

    // Token yönetimi
    useEffect(() => {
        const hash = window.location.hash
            .substring(1)
            .split('&')
            .reduce((initial, item) => {
                if (item) {
                    const parts = item.split('=');
                    initial[parts[0]] = decodeURIComponent(parts[1]);
                }
                return initial;
            }, {});

        window.location.hash = '';

        if (hash.access_token) {
            setToken(hash.access_token);
            localStorage.setItem('spotify_token', hash.access_token);
        }

        const localToken = localStorage.getItem('spotify_token');
        if (!token && localToken) {
            setToken(localToken);
        }
    }, []);

    // Spotify API ile iletişim için fonksiyonlar
    const fetchSpotifyAPI = async (endpoint, options = {}) => {
        try {
            const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Spotify API Error:', error);
            if (error.status === 401) {
                // Token expired
                localStorage.removeItem('spotify_token');
                setToken(null);
            }
            throw error;
        }
    };

    // Playback durumunu kontrol et
    const checkPlaybackState = async () => {
        try {
            const state = await fetchSpotifyAPI('/me/player');
            if (state) {
                setIsPlaying(state.is_playing);
                setCurrentTrack(state.item);
                setDeviceId(state.device.id);
            }
        } catch (error) {
            console.error('Playback state error:', error);
        }
    };

    useEffect(() => {
        if (!token) return;

        // Her 5 saniyede bir durumu kontrol et
        checkPlaybackState();
        const interval = setInterval(checkPlaybackState, 5000);

        return () => clearInterval(interval);
    }, [token]);

    // Kontrol fonksiyonları
    const togglePlay = async () => {
        if (!deviceId) return;

        try {
            const method = isPlaying ? 'pause' : 'play';
            await fetchSpotifyAPI(`/me/player/${method}`, {
                method: 'PUT',
                body: JSON.stringify({ device_id: deviceId })
            });
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Toggle play error:', error);
        }
    };

    const nextTrack = async () => {
        try {
            await fetchSpotifyAPI('/me/player/next', { method: 'POST' });
            setTimeout(checkPlaybackState, 500);
        } catch (error) {
            console.error('Next track error:', error);
        }
    };

    const previousTrack = async () => {
        try {
            await fetchSpotifyAPI('/me/player/previous', { method: 'POST' });
            setTimeout(checkPlaybackState, 500);
        } catch (error) {
            console.error('Previous track error:', error);
        }
    };

    const handleVolumeChange = async (event) => {
        const newVolume = Number(event.target.value);
        setVolume(newVolume);

        try {
            await fetchSpotifyAPI('/me/player/volume', {
                method: 'PUT',
                params: {
                    volume_percent: newVolume
                }
            });
        } catch (error) {
            console.error('Volume change error:', error);
        }
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('spotify_token');
        window.location.reload();
    };

    // UI Render
    return (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-lg w-72">
            {!token ? (
                <button
                    onClick={() => window.location.href = SPOTIFY_AUTH_URL}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                >
                    Login with Spotify
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {currentTrack?.album?.images[0]?.url && (
                                <img
                                    src={currentTrack.album.images[0].url}
                                    alt="Album Art"
                                    className="w-12 h-12 rounded"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {currentTrack?.name || 'No track playing'}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                    {currentTrack?.artists[0]?.name}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="text-xs text-gray-400 hover:text-white"
                        >
                            Logout
                        </button>
                    </div>

                    <div className="flex justify-center items-center space-x-4">
                        <button
                            onClick={previousTrack}
                            className="p-2 hover:bg-gray-800 rounded-full"
                        >
                            <SkipBack size={20} />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="p-3 hover:bg-gray-800 rounded-full"
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        <button
                            onClick={nextTrack}
                            className="p-2 hover:bg-gray-800 rounded-full"
                        >
                            <SkipForward size={20} />
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Volume2 size={16} />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpotifyPlayer;