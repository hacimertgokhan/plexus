import React, { useEffect, useState } from 'react';
import spotifyApi from "@/components/plexus/services/spotifyService.js";

const SpotifyPlaylists = () => {
    const [playlists, setPlaylists] = useState([]);
    const [error, setError] = useState(null);
    const accessToken = spotifyApi.getAccessToken();

    useEffect(() => {
        if (!accessToken) {
            setError('Access token is missing');
            return;
        }
        spotifyApi.setAccessToken(accessToken);

        const fetchPlaylists = async () => {
            try {
                const response = await spotifyApi.getUserPlaylists();
                setPlaylists(response.body.items);
                setError(null);
            } catch (err) {
                setError(err.message || 'Failed to fetch playlists');
            }
        };

        fetchPlaylists();
    }, [accessToken]);

    if (error) {
        return (
            <div className="w-full max-w-md mx-auto p-4 bg-gray-900 rounded-lg shadow text-white">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="w-[250px] h-[500px] overflow-scroll mx-auto p-4  rounded-lg shadow text-white">
            <h3 className="text-lg font-bold mb-4">Your Spotify Playlists</h3>
            <ul className="space-y-2">
                {playlists.map((playlist) => (
                    <li
                        key={playlist.id}
                        className="p-2 flex gap-2 flex-row rounded-lg  hover:bg-gray-700"
                    >
                        <img className={"w-12"} src={playlist.images[0].url} alt={playlist.name}/>
                        <div>
                            <a
                                href={playlist.external_urls.spotify}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-400"
                            >
                                {playlist.name}
                            </a>
                            <p className="text-sm text-gray-400">
                                {playlist.tracks.total} tracks
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SpotifyPlaylists;
