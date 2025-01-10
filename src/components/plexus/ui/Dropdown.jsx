import React, {useState} from 'react';
import '@/style/plexus.css';

const Dropdown = ({title, items}) => {
    const [hover, setHover] = useState(false)
    return (
        <div className={"z-[60]"}>
            <div onClick={() => {setHover(!hover)}} className={" translate-y-6 plexus_dropdown"}>
                <button>{title}</button>
            </div>

            <div style={
                {
                    visibility: hover ? 'visible' : 'hidden',

                }
            } className={"plexus_dropdown_container translate-y-12"}>
                {items.map((item, index) => (
                    <div key={index}>{item.render}</div>
                ))}
            </div>
        </div>
    );
};

export default Dropdown;