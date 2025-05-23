import React from 'react';
import { Animated, PanResponder, StyleSheet, Text } from 'react-native';

interface DraggableCardProps {
  text: string;
  onDrop: (text: string) => void;
  isCorrect?: boolean;
}

export default function DraggableCard({ text, onDrop, isCorrect }: DraggableCardProps) {
  const pan = new Animated.ValueXY();
  const scale = new Animated.Value(1);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      Animated.spring(scale, {
        toValue: 1.1,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gesture) => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      
      // ドロップ位置に応じて処理
      onDrop(text);
      
      // カードを元の位置に戻す
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
    },
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
        isCorrect !== undefined && {
          backgroundColor: isCorrect ? '#4CAF50' : '#F44336',
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 60,
    backgroundColor: '#4a90e2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 