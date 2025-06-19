import * as React from "react";
import type { SvgProps } from "react-native-svg";
import Svg, { Path, Polygon, Rect } from "react-native-svg";

export default function OrangeCastleIcon(props: SvgProps) {
  return (
    <Svg width={200} height={400} viewBox="0 0 200 400" {...props}>
      {/* 本体 */}
      <Rect x="40" y="160" width="120" height="200" fill="#ffd6a5" stroke="#ff8c00" strokeWidth="8"/>
      {/* 左塔 */}
      <Rect x="30" y="80" width="30" height="280" fill="#ffe4b5" stroke="#ff8c00" strokeWidth="5"/>
      <Polygon points="30,80 45,30 60,80" fill="#01b130"/>
      {/* 右塔 */}
      <Rect x="140" y="80" width="30" height="280" fill="#ffe4b5" stroke="#ff8c00" strokeWidth="5"/>
      <Polygon points="140,80 155,30 170,80" fill="#01b130"/>
      {/* 中央塔 */}
      <Rect x="85" y="40" width="30" height="320" fill="#ffe4b5" stroke="#ff8c00" strokeWidth="5"/>
      <Polygon points="85,40 100,10 115,40" fill="#01b130"/>
      {/* ドア（上部だけ丸める） */}
      <Path d="M85 290 Q100 280 115 290 L115 360 L85 360 Z" fill="#8d5524" stroke="#5c2e0a" strokeWidth="2"/>
      {/* 窓（上部だけ丸める） */}
      <Path d="M90 210 Q100 200 110 210 L110 230 L90 230 Z" fill="#fff" stroke="#ff8c00" strokeWidth="2"/>
    </Svg>
  );
} 