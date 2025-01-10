import React, { useState } from 'react';
import '@/style/plexus.css';

const Dropdown = ({ title, items }) => {
    const [hover, setHover] = useState(false);
    const [activeItem, setActiveItem] = useState(null);

    const handleMouseEnter = () => setHover(true);
    const handleMouseLeave = () => setHover(false);
    const handleItemClick = (item) => {
        setActiveItem(item);
        setHover(false);  // Dropdown'ı kapatmak için
    };

    return (
        <div className="relative z-[9999]" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div className="plexus_dropdown">
                <button className="flex justify-between items-center w-full px-4 py-2 rounded-md bg-[#101010] text-white hover:bg-[#e2e2e2]">
                    {activeItem ? activeItem.label : title}
                    <span className="ml-2 text-white">&#9662;</span> {/* Ok simgesi */}
                </button>
            </div>

            {hover && (
                <div className="plexus_dropdown_container absolute left-0 mt-2 w-full bg-[#101010] text-white shadow-lg rounded-md border border-[#e2e2e2] z-[9998]">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => handleItemClick(item)}
                            className={`px-4 py-2 cursor-pointer hover:bg-[#e2e2e2] hover:text-[#101010] ${activeItem === item ? 'bg-[#e2e2e2] text-[#101010]' : ''}`}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
