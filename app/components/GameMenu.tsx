import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 画面サイズの取得
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// iPadの画面サイズを考慮して、画面の向きに関係なく判定
const isSmallScreen = Math.min(screenWidth, screenHeight) < 768; // 768ptを基準に

// ゲーム一覧
const GAMES = [
  { id: 'shiritori', name: '親子しりとり' },
  { id: 'memory', name: 'メモリ対決' },
  { id: 'bugbattle', name: '昆虫バトル' },
] as const;

type GameType = typeof GAMES[number]['id'];

interface GameMenuProps {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSwitchKana: () => void;
  onSwitchMode: () => void;
  isHiragana: boolean;
  isSingleMode: boolean;
  currentGame: GameType;
}

export default function GameMenu({
  visible,
  onClose,
  onRetry,
  onSwitchKana,
  onSwitchMode,
  isHiragana,
  isSingleMode,
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

  const handleSwitchGame = () => {
    // 現在のゲームのインデックスを取得
    const currentIndex = GAMES.findIndex(game => game.id === currentGame);
    // 次のゲームのインデックスを計算（最後の場合は最初に戻る）
    const nextIndex = (currentIndex + 1) % GAMES.length;
    const nextGame = GAMES[nextIndex];
    
    // 昆虫バトルの場合、モードに応じて適切なバージョンを選択
    const targetGameId = nextGame.id === 'bugbattle'
      ? (isSingleMode ? 'bugbattle' : 'bugbattle-pvp')
      : nextGame.id;
    
    // クリーンアップを実行してから画面遷移
    onClose();
    // 画面遷移を遅延させる
    requestAnimationFrame(() => {
      router.replace(`/games/${targetGameId}` as any);
    });
  };

  const handleGameSelect = (gameId: GameType) => {
    if (gameId !== currentGame) {
      // 昆虫バトルの場合、モードに応じて適切なバージョンを選択
      const targetGameId = gameId === 'bugbattle'
        ? (isSingleMode ? 'bugbattle' : 'bugbattle-pvp')
        : gameId;

      // クリーンアップを実行してから画面遷移
      onClose();
      // 画面遷移を遅延させる
      requestAnimationFrame(() => {
        router.replace(`/games/${targetGameId}` as any);
      });
    }
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
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={onClose}
          activeOpacity={1}
        >
          <View style={styles.menuContainer}>
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
                onSwitchMode();
                onClose();
              }}
            >
              <Ionicons name="people" size={24} color="#333" />
              <Text style={styles.menuText}>
                {isSingleMode ? '2人で遊ぶ' : '1人で遊ぶ'}
              </Text>
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
                {isHiragana ? 'カタカナ' : 'ひらがな'}
              </Text>
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
          </View>
        </TouchableOpacity>
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
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 30,
    paddingRight: 50,
  },
  overlayTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    width: 250,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  }
}); 