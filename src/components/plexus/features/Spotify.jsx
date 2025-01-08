import React, { useEffect, useState } from 'react';
import {setAccessToken} from "@/components/plexus/services/spotifyService.js";
import SpotifyPlayer from "@/components/plexus/features/SpotifyPlayer.jsx";
import {PlayIcon, XIcon} from "lucide-react";

function Spotify({isOpen,setIsOpen}) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);


    useEffect(() => {
        const hash = window.location.hash;
        if (hash) {
            const token = hash.substring(1).split("&").find(elem => elem.startsWith("access_token")).split("=")[1];
            setAccessToken(token);
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = () => {
        const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_REDIRECT_URI;
        const scopes = [
            "streaming",
            "user-read-email",
            "user-read-private",
            "user-library-read",
            "user-library-modify",
            "user-read-playback-state",
            "user-modify-playback-state",
            "app-remote-control",
            "user-read-currently-playing",
            'user-read-private',
            'streaming'
        ];

        window.location.href = `${AUTH_ENDPOINT}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join("%20")}&response_type=token&show_dialog=true`;
    };


    return (
        <div className={`min-h-screen w-fit transition-[300ms] bg-[#09090b75] border-[#202020] border-[1px] p-8 ${isOpen === false ? "hidden" : "flex"}`}>
            {isAuthenticated ? (
                <>
                    <div className={"w-[50px] right-0 h-[50px] flex items-center justify-center bg-[#09090b] absolute top-0"}>
                        <button
                            className="flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors"
                            onClick={() => {
                                setIsOpen(!isOpen);
                            }}
                        >
                            <XIcon size={16}/>
                        </button>
                    </div>
                    <br/>
                    <br/>
                    <br/>
                    <SpotifyPlayer/>
                </>
            ) : (
                <button
                    onClick={handleLogin}
                    className="bg-green-500 text-white px-6 py-3 w-fit h-fit rounded-full hover:bg-green-600"
                >
                    Login with Spotify
                </button>
            )}
        </div>
    );
}

export default Spotify;