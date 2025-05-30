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
  isHiragana: boolean;
  currentGame: GameType;
}

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

  const handleSwitchGame = () => {
    const availableGames = GAMES.filter(game => game.id !== currentGame);
    const randomGame = availableGames[Math.floor(Math.random() * availableGames.length)];
    router.push(`/games/${randomGame.id}`);
    onClose();
  };

  const handleGameSelect = (gameId: GameType) => {
    if (gameId !== currentGame) {
      router.push(`/games/${gameId}`);
      onClose();
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
                onSwitchKana();
                onClose();
              }}
            >
              <Ionicons name="text" size={24} color="#333" />
              <Text style={styles.menuText}>
                {isHiragana ? 'カタカナに切替' : 'ひらがなに切替'}
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
            <View style={styles.gameButtonsContainer}>
              {GAMES.map((game) => (
                <TouchableOpacity
                  key={game.id}
                  style={[
                    game.id === currentGame ? styles.currentGameButton : styles.gameButton,
                  ]}
                  onPress={() => handleGameSelect(game.id)}
                  disabled={game.id === currentGame}
                >
                  <Text
                    style={[
                      game.id === currentGame ? styles.currentGameButtonText : styles.gameButtonText,
                    ]}
                  >
                    {game.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  },
  gameButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: isSmallScreen ? 10 : 20,
  },
  gameButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    borderRadius: 5,
    minWidth: isSmallScreen ? 80 : 100,
  },
  currentGameButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 8,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    borderRadius: 5,
    minWidth: isSmallScreen ? 80 : 100,
  },
  gameButtonText: {
    color: '#333',
    fontSize: isSmallScreen ? 12 : 14,
    textAlign: 'center',
  },
  currentGameButtonText: {
    color: '#fff',
    fontSize: isSmallScreen ? 12 : 14,
    textAlign: 'center',
  },
}); 