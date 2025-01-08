import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import * as spotifyService from '../services/spotifyService';
import SpotifyPlaylists from "@/components/plexus/features/SpotifyPlaylists.jsx";

const SpotifyPlayer = () => {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(null);

    const updatePlayerState = async () => {
        try {
            const state = await spotifyService.getCurrentTrack();
            if (state) {
                setCurrentTrack(state.item);
                setIsPlaying(state.is_playing);
                setPosition(state.progress_ms);
                setDuration(state.item?.duration_ms || 0);
                setError(null);
            } else {
                setError('No track currently playing');
            }
        } catch (error) {
            if (error.message === 'No active device found') {
                setError('Please open Spotify on any device and start playing');
            } else if (error.message === 'Token expired') {
                // Token yenilemesi gerekiyor
                window.location.href = '/'; // Login sayfasına yönlendir
            } else {
                setError(error.message);
            }
        }
    };

    useEffect(() => {
        // İlk yükleme
        updatePlayerState();

        // Periyodik güncelleme
        const interval = setInterval(updatePlayerState, 1000);
        return () => clearInterval(interval);
    }, []);

    const handlePlayPause = async () => {
        try {
            await spotifyService.togglePlayback(isPlaying);
            setIsPlaying(!isPlaying);
            setError(null);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleNext = async () => {
        try {
            await spotifyService.skipToNext();
            setError(null);
            // Kısa bir gecikme ile yeni şarkı bilgisini al
            setTimeout(updatePlayerState, 200);
        } catch (error) {
            setError(error.message);
        }
    };

    const handlePrevious = async () => {
        try {
            await spotifyService.skipToPrevious();
            setError(null);
            setTimeout(updatePlayerState, 200);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleSeek = async (e) => {
        const newPosition = parseInt(e.target.value);
        try {
            await spotifyService.seekToPosition(newPosition);
            setPosition(newPosition);
            setError(null);
        } catch (error) {
            setError(error.message);
        }
    };

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (error) {
        return (
            <div className="w-full max-w-md mx-auto p-4 rounded-lg text-white">
                <div className="text-center p-4">
                    <p className="text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto p-4  rounded-lg text-white">
            {currentTrack ? (
                <>
                    <div className="mb-4 text-center">
                        <h3 className="font-bold text-lg">{currentTrack.name}</h3>
                        <p className="text-gray-400">{currentTrack.artists[0].name}</p>
                        {currentTrack.album?.images?.[0]?.url && (
                            <img
                                src={currentTrack.album.images[0].url}
                                alt="Album Cover"
                                className="w-48 h-48 mx-auto my-4 rounded-md shadow-lg"
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-center space-x-4 mb-4">
                        <button
                            onClick={handlePrevious}
                            className="p-2 rounded-full hover:bg-gray-800"
                        >
                            <SkipBack className="w-6 h-6" />
                        </button>

                        <button
                            onClick={handlePlayPause}
                            className="p-3 bg-green-500 rounded-full hover:bg-green-600"
                        >
                            {isPlaying ? (
                                <Pause className="w-8 h-8" />
                            ) : (
                                <Play className="w-8 h-8" />
                            )}
                        </button>

                        <button
                            onClick={handleNext}
                            className="p-2 rounded-full hover:bg-gray-800"
                        >
                            <SkipForward className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            value={position}
                            onChange={handleSeek}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>{formatTime(position)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center p-4">
                    <p>No track currently playing</p>
                    <p className="text-sm text-gray-400 mt-2">
                        Start playing something on Spotify
                    </p>
                </div>
            )}
            <SpotifyPlaylists />
        </div>
    );
};

export default SpotifyPlayer;