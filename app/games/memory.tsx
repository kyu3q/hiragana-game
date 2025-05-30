import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameLayout from '../components/GameLayout';
import GameMenu from '../components/GameMenu';
import { useGame } from '../contexts/GameContext';

const { width: rawWidth, height: rawHeight } = Dimensions.get('window');
const screenWidth = Math.max(rawWidth, rawHeight);
const isSmallScreen =  Math.min(rawWidth, rawHeight) < 768; // 768ptを基準に

// 音声ファイルのインポート
const OK_SOUND = require('../../assets/sounds/OK_Memory.mp3');
const NG_SOUND = require('../../assets/sounds/NG_Memory.mp3');
const FINISH_SOUND = require('../../assets/sounds/Finish.mp3');

// アンパンマンの画像をインポート
const anpanmanImages: { [key: string]: any } = {
  '1': require('../../assets/images/memory/anpanman1.png'),
  '2': require('../../assets/images/memory/anpanman2.png'),
  '3': require('../../assets/images/memory/anpanman3.png'),
  '4': require('../../assets/images/memory/anpanman4.png'),
  '5': require('../../assets/images/memory/anpanman5.png'),
  '6': require('../../assets/images/memory/anpanman6.png'),
  '7': require('../../assets/images/memory/anpanman7.png'),
  '8': require('../../assets/images/memory/anpanman8.png'),
  '9': require('../../assets/images/memory/anpanman9.png'),
  '10': require('../../assets/images/memory/anpanman10.png'),
  '11': require('../../assets/images/memory/anpanman11.png'),
  '12': require('../../assets/images/memory/anpanman12.png'),
  '13': require('../../assets/images/memory/anpanman13.png'),
  '14': require('../../assets/images/memory/anpanman14.png'),
  '15': require('../../assets/images/memory/anpanman15.png'),
  '16': require('../../assets/images/memory/anpanman16.png'),
  '17': require('../../assets/images/memory/anpanman17.png'),
  '18': require('../../assets/images/memory/anpanman18.png'),
  '19': require('../../assets/images/memory/anpanman19.png'),
  '20': require('../../assets/images/memory/anpanman20.png'),
};

// ひらがな文字データの定義
const hiraganaMainTable = [
  ['ん','わ','ら','や','ま','は','な','た','さ','か','あ'],
  ['','','り','','み','ひ','に','ち','し','き','い'],
  ['','','る','ゆ','む','ふ','ぬ','つ','す','く','う'],
  ['','','れ','','め','へ','ね','て','せ','け','え'],
  ['','を','ろ','よ','も','ほ','の','と','そ','こ','お'],
];

const hiraganaDakuonTable = [
  ['が','ざ','だ','ば','ぱ'],
  ['ぎ','じ','ぢ','び','ぴ'],
  ['ぐ','ず','づ','ぶ','ぷ'],
  ['げ','ぜ','で','べ','ぺ'],
  ['ご','ぞ','ど','ぼ','ぽ'],
];

const hiraganaYouonTable = [
  ['きゃ','ぎゃ','しゃ','じゃ','ちゃ','にゃ','ひゃ','びゃ','ぴゃ','みゃ','りゃ'],
  ['きゅ','ぎゅ','しゅ','じゅ','ちゅ','にゅ','ひゅ','びゅ','ぴゅ','みゅ','りゅ'],
  ['きょ','ぎょ','しょ','じょ','ちょ','にょ','ひょ','びょ','ぴょ','みょ','りょ'],
];

// カタカナ文字データの定義
const katakanaMainTable = [
  ['ン','ワ','ラ','ヤ','マ','ハ','ナ','タ','サ','カ','ア'],
  ['','','リ','','ミ','ヒ','ニ','チ','シ','キ','イ'],
  ['','','ル','ユ','ム','フ','ヌ','ツ','ス','ク','ウ'],
  ['','','レ','','メ','ヘ','ネ','テ','セ','ケ','エ'],
  ['','ヲ','ロ','ヨ','モ','ホ','ノ','ト','ソ','コ','オ'],
];

const katakanaDakuonTable = [
  ['ガ','ザ','ダ','バ','パ'],
  ['ギ','ジ','ヂ','ビ','ピ'],
  ['グ','ズ','ヅ','ブ','プ'],
  ['ゲ','ゼ','デ','ベ','ペ'],
  ['ゴ','ゾ','ド','ボ','ポ'],
];

const katakanaYouonTable = [
  ['キャ','ギャ','シャ','ジャ','チャ','ニャ','ヒャ','ビャ','ピャ','ミャ','リャ'],
  ['キュ','ギュ','シュ','ジュ','チュ','ニュ','ヒュ','ビュ','ピュ','ミュ','リュ'],
  ['キョ','ギョ','ショ','ジョ','チョ','ニョ','ヒョ','ビョ','ピョ','ミョ','リョ'],
];

type Card = {
  id: number;
  value: string;
  type: 'hiragana' | 'katakana' | 'anpanman';
  isFlipped: boolean;
  isMatched: boolean;
};

type PlayerType = 'lion' | 'dog';

const MemoryGame = () => {
  const { isHiragana, setIsHiragana } = useGame();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedType, setSelectedType] = useState<'main' | 'dakuon' | 'youon' | 'anpanman'>('main');
  const [isBattleMode, setIsBattleMode] = useState(true);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerType>('lion');
  const [playerPairs, setPlayerPairs] = useState({ lion: 0, dog: 0 });
  const [showResult, setShowResult] = useState(false);
  const [winner, setWinner] = useState<'lion' | 'dog' | 'draw' | null>(null);
  const [matchedColors, setMatchedColors] = useState<{ [key: number]: PlayerType }>({});
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const router = useRouter();
  const flipAnimations = useRef<{ [key: number]: Animated.Value }>({}).current;
  const [bounceAnim] = useState(new Animated.Value(0));
  const [textBounceAnim] = useState(new Animated.Value(0));
  const [isBattleButtonPressed, setIsBattleButtonPressed] = useState(false);
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // 文字の種類に応じて文字を取得
  const getCharacters = (type: 'hiragana' | 'katakana') => {
    if (selectedType === 'anpanman') {
      return Object.keys(anpanmanImages);
    }

    let characters: string[] = [];
    const table = type === 'hiragana' ? 
      { main: hiraganaMainTable, dakuon: hiraganaDakuonTable, youon: hiraganaYouonTable } :
      { main: katakanaMainTable, dakuon: katakanaDakuonTable, youon: katakanaYouonTable };

    switch (selectedType) {
      case 'main':
        characters = table.main.flat().filter(char => char !== '');
        break;
      case 'dakuon':
        characters = table.dakuon.flat();
        break;
      case 'youon':
        characters = table.youon.flat();
        break;
      default:
        characters = table.main.flat().filter(char => char !== '');
    }
    return characters;
  };

  // ランダムに12文字を選択（24枚のカード用）
  const getRandomCharacters = (characters: string[]) => {
    const shuffled = [...characters].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12);
  };

  // カードペアを作成
  const createCardPairs = () => {
    const allCharacters = selectedType === 'anpanman' ? 
      Object.keys(anpanmanImages) : 
      getCharacters(isHiragana ? 'hiragana' : 'katakana');
    const selectedCharacters = getRandomCharacters(allCharacters);
    
    const pairs = selectedCharacters.map((char, index) => [
      {
        id: index * 2,
        value: char,
        type: selectedType === 'anpanman' ? 'anpanman' as const : (isHiragana ? 'hiragana' as const : 'katakana' as const),
        isFlipped: false,
        isMatched: false
      },
      {
        id: index * 2 + 1,
        value: char,
        type: selectedType === 'anpanman' ? 'anpanman' as const : (isHiragana ? 'hiragana' as const : 'katakana' as const),
        isFlipped: false,
        isMatched: false
      }
    ]).flat();
    
    // アニメーション値を初期化
    pairs.forEach(card => {
      flipAnimations[card.id] = new Animated.Value(0);
    });
    
    return pairs.sort(() => Math.random() - 0.5);
  };

  useEffect(() => {
    // アニメーション値をリセット
    Object.keys(flipAnimations).forEach(key => {
      flipAnimations[Number(key)].setValue(0);
    });
    bounceAnim.setValue(0);
    textBounceAnim.setValue(0);
    buttonAnim.setValue(0);
    buttonScale.setValue(1);

    // 状態をリセット
    setCards(createCardPairs());
    setFlippedCards([]);
    setMatchedPairs([]);
    setCurrentPlayer('lion');
    setPlayerPairs({ lion: 0, dog: 0 });
    setShowResult(false);
    setWinner(null);
    setMatchedColors({});
    setIsChecking(false);
    setIsBattleButtonPressed(false);
  }, [selectedType, isHiragana]);

  // 音声を再生する関数
  const playSound = async (soundFile: any) => {
    try {
      const { sound } = await Audio.Sound.createAsync(soundFile);
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // コンポーネントのアンマウント時に音声をクリーンアップ
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const handleRetry = () => {
    // アニメーション値をリセット
    Object.keys(flipAnimations).forEach(key => {
      flipAnimations[Number(key)].setValue(0);
    });
    bounceAnim.setValue(0);
    textBounceAnim.setValue(0);
    buttonAnim.setValue(0);
    buttonScale.setValue(1);

    // 状態をリセット
    setCards(createCardPairs());
    setFlippedCards([]);
    setMatchedPairs([]);
    setCurrentPlayer('lion');
    setPlayerPairs({ lion: 0, dog: 0 });
    setShowResult(false);
    setWinner(null);
    setMatchedColors({});
    setIsChecking(false);
    setIsBattleButtonPressed(false);
  };

  const handleBattleModeToggle = () => {
    const newBattleMode = !isBattleMode;
    setIsBattleMode(newBattleMode);
    
    // アニメーション値をリセット
    Object.keys(flipAnimations).forEach(key => {
      flipAnimations[Number(key)].setValue(0);
    });
    bounceAnim.setValue(0);
    textBounceAnim.setValue(0);
    buttonAnim.setValue(0);
    buttonScale.setValue(1);

    // 状態をリセット
    setCurrentPlayer('lion');
    setPlayerPairs({ lion: 0, dog: 0 });
    setCards(createCardPairs());
    setFlippedCards([]);
    setMatchedPairs([]);
    setMatchedColors({});
    setIsChecking(false);
    setIsBattleButtonPressed(false);
    setShowResult(false);
    setWinner(null);
  };

  const handleCardClick = (clickedCard: Card) => {
    if (
      isChecking || 
      flippedCards.length >= 2 || 
      clickedCard.isMatched || 
      flippedCards.includes(clickedCard) ||
      (flippedCards.length === 1 && flippedCards[0].id === clickedCard.id)
    ) {
      return;
    }

    // カードをフリップ
    Animated.timing(flipAnimations[clickedCard.id], {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const updatedCards = cards.map(card => 
      card.id === clickedCard.id ? { ...card, isFlipped: true } : card
    );
    setCards(updatedCards);

    const newFlippedCards = [...flippedCards, clickedCard];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setIsChecking(true);
      const [first, second] = newFlippedCards;
      
      if (first.value === second.value) {
        // マッチ成功時の音を再生
        playSound(OK_SOUND);
        
        const matchedCards = updatedCards.map(card => 
          card.id === first.id || card.id === second.id ? { ...card, isMatched: true } : card
        );
        setCards(matchedCards);

        // マッチしたペアのIDを追加（重複チェック付き）
        const newMatchedPairs = [...matchedPairs];
        if (!newMatchedPairs.includes(first.id)) {
          newMatchedPairs.push(first.id);
        }
        if (!newMatchedPairs.includes(second.id)) {
          newMatchedPairs.push(second.id);
        }
        setMatchedPairs(newMatchedPairs);

        // 現在のプレイヤーの色を記録
        const currentPlayerAtMatch = currentPlayer;
        setMatchedColors(prev => ({
          ...prev,
          [first.id]: currentPlayerAtMatch,
          [second.id]: currentPlayerAtMatch
        }));

        setFlippedCards([]);
        setIsChecking(false);
        if (isBattleMode) {
          const newPlayerPairs = { ...playerPairs, [currentPlayerAtMatch]: playerPairs[currentPlayerAtMatch] + 1 };
          setPlayerPairs(newPlayerPairs);
          
          if (newMatchedPairs.length === cards.length) {
            // ゲーム終了時の音を再生
            playSound(FINISH_SOUND);
            const lionScore = newPlayerPairs.lion;
            const dogScore = newPlayerPairs.dog;
            if (lionScore > dogScore) {
              setWinner('lion');
            } else if (dogScore > lionScore) {
              setWinner('dog');
            } else {
              setWinner('draw');
            }
            setShowResult(true);
          }
        }
      } else {
        // マッチ失敗時の音を再生
        playSound(NG_SOUND);
        
        setTimeout(() => {
          // カードを元に戻す
          Animated.timing(flipAnimations[first.id], {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
          Animated.timing(flipAnimations[second.id], {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();

          const resetCards = updatedCards.map(card => 
            card.id === first.id || card.id === second.id ? { ...card, isFlipped: false } : card
          );
          setCards(resetCards);
          setFlippedCards([]);
          setIsChecking(false);
          if (isBattleMode) {
            setCurrentPlayer(prev => (prev === 'lion' ? 'dog' : 'lion'));
          }
        }, 1000);
      }
    }
  };

  const handleSwitchKana = () => {
    setIsHiragana(!isHiragana);
    handleRetry();
  };

  useEffect(() => {
    if (showResult) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(textBounceAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(textBounceAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showResult]);

  const handleBattleButtonPressIn = () => {
    setIsBattleButtonPressed(true);
    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleBattleButtonPressOut = () => {
    setIsBattleButtonPressed(false);
    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const renderCard = (card: Card) => {
    if (!flipAnimations[card.id]) {
      flipAnimations[card.id] = new Animated.Value(0);
    }

    const frontAnimatedStyle = {
      transform: [
        {
          rotateY: flipAnimations[card.id].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '180deg']
          })
        }
      ]
    };

    const backAnimatedStyle = {
      transform: [
        {
          rotateY: flipAnimations[card.id].interpolate({
            inputRange: [0, 1],
            outputRange: ['180deg', '360deg']
          })
        }
      ]
    };

    const cardFrontStyle = [
      styles.cardFront,
      frontAnimatedStyle,
      isBattleMode ? (currentPlayer === 'lion' ? styles.lionTurn : styles.dogTurn) : styles.singlePlayerTurn
    ];

    const cardBackStyle = [
      styles.cardBack,
      backAnimatedStyle,
      !card.isMatched && (isBattleMode ? (currentPlayer === 'lion' ? styles.lionBack : styles.dogBack) : styles.singlePlayerBack)
    ];

    // マッチしたカードのスタイルを決定
    const matchedStyle = card.isMatched ? 
      (isBattleMode ? (matchedColors[card.id] === 'lion' ? styles.lionMatched : styles.dogMatched) : styles.singlePlayerMatched) : 
      null;

    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.card,
          card.isMatched && styles.cardMatched,
          matchedStyle
        ]}
        onPress={() => handleCardClick(card)}
        disabled={isChecking || card.isMatched}
      >
        <View style={styles.cardInner}>
          <Animated.View style={cardFrontStyle}>
            <Text style={styles.cardFrontText}>?</Text>
          </Animated.View>
          <Animated.View style={[cardBackStyle, matchedStyle]}>
            {card.type === 'anpanman' ? (
              <Image
                source={anpanmanImages[card.value]}
                style={styles.cardImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.cardText}>{card.value}</Text>
            )}
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  if (showResult) {
    const bounceStyle = {
      transform: [
        {
          translateY: bounceAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -20],
          }),
        },
      ],
    };

    const textBounceStyle = {
      transform: [
        {
          translateY: textBounceAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          }),
        },
      ],
    };

    return (
      <GameLayout>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setIsSettingsVisible(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
          </TouchableOpacity>
          <GameMenu
            visible={isSettingsVisible}
            onClose={() => setIsSettingsVisible(false)}
            onRetry={handleRetry}
            onSwitchKana={handleSwitchKana}
            isHiragana={isHiragana}
            currentGame="memory"
          />
          <View style={styles.resultArea}>
            <View style={styles.resultContent}>
              <Animated.View style={[styles.winnerEmojiContainer, bounceStyle]}>
                <Text style={styles.winnerEmoji}>
                  {winner === 'draw' ? '🤝' : winner === 'lion' ? '🦁' : '🐶'}
                </Text>
              </Animated.View>
              <Animated.Text style={[
                styles.winnerText,
                winner === 'lion' ? styles.lionColor : winner === 'dog' ? styles.dogColor : styles.drawColor,
                textBounceStyle
              ]}>
                <Text>🎉{winner === 'draw' ? '引き分け！' : `${winner === 'lion' ? '🦁' : '🐶'}の勝ち！`}</Text>
              </Animated.Text>
              <View style={styles.resultScores}>
                <View style={styles.resultScoreRow}>
                  <Text style={styles.playerEmoji}>🦁</Text>
                  <Text style={[styles.scoreText, styles.lionColor]}>
                    {playerPairs.lion * 2} 枚
                  </Text>
                </View>
                <View style={styles.resultScoreRow}>
                  <Text style={styles.playerEmoji}>🐶</Text>
                  <Text style={[styles.scoreText, styles.dogColor]}>
                    {playerPairs.dog * 2} 枚
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </GameLayout>
    );
  }

  return (
    <GameLayout>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setIsSettingsVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
        </TouchableOpacity>
        <GameMenu
          visible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
          onRetry={handleRetry}
          onSwitchKana={handleSwitchKana}
          isHiragana={isHiragana}
          currentGame="memory"
        />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>同じ文字を探そう！</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'main' && styles.typeButtonActive]}
                onPress={() => setSelectedType('main')}
              >
                <Text style={[styles.typeButtonText, selectedType === 'main' && styles.typeButtonTextActive]}>
                  清音
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'dakuon' && styles.typeButtonActive]}
                onPress={() => setSelectedType('dakuon')}
              >
                <Text style={[styles.typeButtonText, selectedType === 'dakuon' && styles.typeButtonTextActive]}>
                  濁音・半濁音
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'youon' && styles.typeButtonActive]}
                onPress={() => setSelectedType('youon')}
              >
                <Text style={[styles.typeButtonText, selectedType === 'youon' && styles.typeButtonTextActive]}>
                  拗音
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, selectedType === 'anpanman' && styles.typeButtonActive]}
                onPress={() => setSelectedType('anpanman')}
              >
                <Text style={[styles.typeButtonText, selectedType === 'anpanman' && styles.typeButtonTextActive]}>
                  アンパンマン
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.battleButton, isBattleMode && styles.battleButtonActive]}
                onPress={handleBattleModeToggle}
              >
                <Text style={[styles.battleButtonText, isBattleMode && styles.battleButtonTextActive]}>
                  {isBattleMode ? 'ひとりで遊び' : '対決'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.gameBoard}>
          {cards.map(renderCard)}
        </View>
        {isBattleMode && (
          <View style={styles.battleInfo}>
            <View style={styles.playerInfo}>
              <Text style={[styles.playerEmoji, currentPlayer === 'lion' && styles.currentPlayer]}>
                🦁
              </Text>
              <Text style={[styles.playerScore, styles.lionColor]}>
                {playerPairs.lion * 2} 枚
              </Text>
            </View>
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.playerInfo}>
              <Text style={[styles.playerEmoji, currentPlayer === 'dog' && styles.currentPlayer]}>
                🐶
              </Text>
              <Text style={[styles.playerScore, styles.dogColor]}>
                {playerPairs.dog * 2} 枚
              </Text>
            </View>
          </View>
        )}
      </View>
    </GameLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: isSmallScreen ? 25 : 25,
    width: '100%',
    alignItems: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  header: {
    width: '100%',
    marginBottom: isSmallScreen ? 10 : 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: isSmallScreen ? 10 : 30,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'sans-serif',
    fontSize: isSmallScreen ? 20 : 24,
    color: '#2c3e50',
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: isSmallScreen ? 4 : 8,
  },
  typeButton: {
    paddingVertical: isSmallScreen ? 8 : 10,
    paddingHorizontal: isSmallScreen ? 10 : 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e74c3c',
    backgroundColor: 'white',
  },
  typeButtonActive: {
    backgroundColor: '#e74c3c',
  },
  typeButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'sans-serif',
    fontSize: isSmallScreen ? 12 : 16,
    color: '#e74c3c',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  battleButtonContainer: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#a83ce7',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  battleButton: {
    paddingVertical: isSmallScreen ? 8 : 10,
    paddingHorizontal: isSmallScreen ? 10 : 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#a83ce7',
    backgroundColor: 'white',
  },
  battleButtonActive: {
    backgroundColor: '#a83ce7',
  },
  battleButtonText: {
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'sans-serif',
    fontSize: isSmallScreen ? 12 : 16,
    color: '#a83ce7',
    fontWeight: '500',
  },
  battleButtonTextActive: {
    color: 'white',
  },
  gameBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: isSmallScreen ? 0 : 20,
    maxWidth: screenWidth,
    gap: isSmallScreen ? 6 : 12,
  },
  card: {
    width: isSmallScreen 
      ? (screenWidth - 190) / 6  
      : (screenWidth - 160) / 6,  // iPad用（実際の画面幅から余白を引く）
    aspectRatio: isSmallScreen 
      ? 2.5 
      : 1.8,  // iPad用（縦幅を調整：1.8は横:縦 = 9:5の比率）
    margin: 0,
  },
  cardMatched: {
    opacity: 0.7,
  },
  cardInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardFront: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#5eb5fc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#3498db',
    backfaceVisibility: 'hidden',
  },
  cardText: {
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'sans-serif',
    fontSize: isSmallScreen ? 24 : 48,
    fontWeight: '500',
  },
  cardFrontText: {
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'sans-serif',
    fontSize: isSmallScreen ? 24 : 48,
    fontWeight: '500',
    color: 'white',
  },
  lionTurn: {
    backgroundColor: '#fbbc5d',
  },
  dogTurn: {
    backgroundColor: '#5eb5fc',
  },
  lionBack: {
    borderColor: '#fbbc5d',
  },
  dogBack: {
    borderColor: '#5eb5fc',
  },
  battleInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
    marginTop: 15,
  },
  playerInfo: {
    alignItems: 'center',
  },
  playerEmoji: {
    fontSize: isSmallScreen ? 24 : 36,
    marginBottom: 4,
  },
  currentPlayer: {
    fontSize: isSmallScreen ? 32 : 64,
    transform: [{ scale: 1.1 }],
  },
  playerScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vsText: {
    fontSize: 20,
    color: '#666',
  },
  resultArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  resultContent: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 30,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 8,
  },
  winnerEmojiContainer: {
    marginBottom: 20,
  },
  winnerEmoji: {
    fontSize: 80,
  },
  winnerText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  resultScores: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 20,
  },
  resultScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  lionColor: {
    color: '#fbbc5d',
  },
  dogColor: {
    color: '#5eb5fc',
  },
  drawColor: {
    color: '#888',
  },
  lionMatched: {
    borderColor: '#fbbc5d',
  },
  dogMatched: {
    borderColor: '#5eb5fc',
  },
  singlePlayerTurn: {
    backgroundColor: '#5eb5fc',
  },
  singlePlayerBack: {
    borderColor: '#5eb5fc',
  },
  singlePlayerMatched: {
    borderColor: '#5eb5fc',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});

export default MemoryGame;