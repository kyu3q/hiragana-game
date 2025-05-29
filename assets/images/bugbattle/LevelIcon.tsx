import React from 'react';
import Svg, { G, Path, Text } from 'react-native-svg';

interface LevelIconProps {
  level: number;
  width?: number;
  height?: number;
}

const LevelIcon: React.FC<LevelIconProps> = ({ level, width = 100, height = 100 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      <G>
        {/* 外側の丸 */}
        <Path
          d="M50,20 C30,20 20,30 20,50 C20,70 30,80 50,80 C70,80 80,70 80,50 C80,30 70,20 50,20 Z"
          fill="#E53935"
          stroke="#000"
          strokeWidth="2"
        />
        {/* 内側の丸（白） */}
        <Path
          d="M50,30 C35,30 30,35 30,50 C30,65 35,70 50,70 C65,70 70,65 70,50 C70,35 65,30 50,30 Z"
          fill="#FFF"
          stroke="#000"
          strokeWidth="1"
        />
        <Text
          x="50"
          y="65"
          fontSize="28"
          fontWeight="bold"
          fill="#E53935"
          textAnchor="middle"
          stroke="#000"
          strokeWidth="0.5"
        >
          {level}
        </Text>
      </G>
    </Svg>
  );
};

export default LevelIcon; 