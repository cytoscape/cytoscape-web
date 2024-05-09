import React from 'react';

interface IconProps {
    icon: string; // Unicode string for the icon
}

const Icon: React.FC<IconProps> = ({ icon }) => {
    return <i className={`icon ${icon}`} aria-hidden="true"></i>;
};

export default Icon;
