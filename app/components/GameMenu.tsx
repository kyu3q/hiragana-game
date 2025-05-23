import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type GameMenuProps = {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSwitchKana: () => void;
  isHiragana: boolean;
  currentGame: string;
};

// ゲーム一覧
const GAMES = [
  { id: 'shiritori', name: '親子しりとり' },
  { id: 'memory', name: 'めもりー対決！' },
  { id: 'bugbattle', name: '昆虫バトル' },
] as const;

export default function GameMenu({
  visible,
  onClose,
  onRetry,
  onSwitchKana,
  isHiragana,
  currentGame,
}: GameMenuProps) {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // ゲーム切替処理
  const handleSwitchGame = () => {
    // 現在のゲーム以外のゲームを取得
    const availableGames = GAMES.filter(game => game.id !== currentGame);
    // ランダムに1つ選択
    const nextGame = availableGames[Math.floor(Math.random() * availableGames.length)];
    // 選択したゲームに遷移
    router.push(`/games/${nextGame.id}`);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onRetry();
              onClose();
            }}
          >
            <Ionicons name="refresh" size={24} color="#333" />
            <Text style={styles.menuText}>リトライ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              handleSwitchGame();
              onClose();
            }}
          >
            <Ionicons name="game-controller" size={24} color="#333" />
            <Text style={styles.menuText}>ゲーム切替</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onSwitchKana();
              onClose();
            }}
          >
            <Ionicons name="text" size={24} color="#333" />
            <Text style={styles.menuText}>
              {isHiragana ? 'カタカナに切替' : 'ひらがなに切替'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
}); 