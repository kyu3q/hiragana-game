import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { shiritoriData as hiraganaData } from '../../constants/games/shiritoriHiragana';
import { shiritoriData as katakanaData } from '../../constants/games/shiritoriKatakana';
import GameLayout from '../components/GameLayout';
import GameMenu from '../components/GameMenu';
import { useGame } from '../contexts/GameContext';

const { width: rawWidth, height: rawHeight } = Dimensions.get('window');
const screenWidth = Math.max(rawWidth, rawHeight);
const isSmallScreen =  Math.min(rawWidth, rawHeight) < 768; // 768ptを基準に

// 拗音マッピング
const yoonMapHiragana: { [key: string]: string } = {
  'しゃ': 'や', 'しゅ': 'ゆ', 'しょ': 'よ',
  'じゃ': 'や', 'じゅ': 'ゆ', 'じょ': 'よ',
  'ちゃ': 'や', 'ちゅ': 'ゆ', 'ちょ': 'よ',
  'きゃ': 'や', 'きゅ': 'ゆ', 'きょ': 'よ',
  'ぎゃ': 'や', 'ぎゅ': 'ゆ', 'ぎょ': 'よ',
  'にゃ': 'や', 'にゅ': 'ゆ', 'にょ': 'よ',
  'ひゃ': 'や', 'ひゅ': 'ゆ', 'ひょ': 'よ',
  'びゃ': 'や', 'びゅ': 'ゆ', 'びょ': 'よ',
  'ぴゃ': 'や', 'ぴゅ': 'ゆ', 'ぴょ': 'よ',
  'みゃ': 'や', 'みゅ': 'ゆ', 'みょ': 'よ',
  'りゃ': 'や', 'りゅ': 'ゆ', 'りょ': 'よ',
  'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
};

const yoonInitialsHiragana: { [key: string]: string[] } = {
  'り': ['りゃ', 'りゅ', 'りょ'],
  'し': ['しゃ', 'しゅ', 'しょ'],
  'ち': ['ちゃ', 'ちゅ', 'ちょ'],
  'き': ['きゃ', 'きゅ', 'きょ'],
  'ぎ': ['ぎゃ', 'ぎゅ', 'ぎょ'],
  'じ': ['じゃ', 'じゅ', 'じょ'],
  'に': ['にゃ', 'にゅ', 'にょ'],
  'ひ': ['ひゃ', 'ひゅ', 'ひょ'],
  'び': ['びゃ', 'びゅ', 'びょ'],
  'ぴ': ['ぴゃ', 'ぴゅ', 'ぴょ'],
  'み': ['みゃ', 'みゅ', 'みょ'],
  'ゆ': ['ゆ'], 'よ': ['よ']
};

const yoonMapKatakana: { [key: string]: string } = {
  'シャ': 'ヤ', 'シュ': 'ユ', 'ショ': 'ヨ',
  'ジャ': 'ヤ', 'ジュ': 'ユ', 'ジョ': 'ヨ',
  'チャ': 'ヤ', 'チュ': 'ユ', 'チョ': 'ヨ',
  'キャ': 'ヤ', 'キュ': 'ユ', 'キョ': 'ヨ',
  'ギャ': 'ヤ', 'ギュ': 'ユ', 'ギョ': 'ヨ',
  'ニャ': 'ヤ', 'ニュ': 'ユ', 'ニョ': 'ヨ',
  'ヒャ': 'ヤ', 'ヒュ': 'ユ', 'ヒョ': 'ヨ',
  'ビャ': 'ヤ', 'ビュ': 'ユ', 'ビョ': 'ヨ',
  'ピャ': 'ヤ', 'ピュ': 'ユ', 'ピョ': 'ヨ',
  'ミャ': 'ヤ', 'ミュ': 'ユ', 'ミョ': 'ヨ',
  'リャ': 'ヤ', 'リュ': 'ユ', 'リョ': 'ヨ',
  'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ',
};

const yoonInitialsKatakana: { [key: string]: string[] } = {
  'リ': ['リャ', 'リュ', 'リョ'],
  'シ': ['シャ', 'シュ', 'ショ'],
  'チ': ['チャ', 'チュ', 'チョ'],
  'キ': ['キャ', 'キュ', 'キョ'],
  'ギ': ['ギャ', 'ギュ', 'ギョ'],
  'ジ': ['ジャ', 'ジュ', 'ジョ'],
  'ニ': ['ニャ', 'ニュ', 'ニョ'],
  'ヒ': ['ヒャ', 'ヒュ', 'ヒョ'],
  'ビ': ['ビャ', 'ビュ', 'ビョ'],
  'ピ': ['ピャ', 'ピュ', 'ピョ'],
  'ミ': ['ミャ', 'ミュ', 'ミョ']
};

type ShiritoriData = {
  shiritoriWords: { [key: string]: string[] };
  wordsEndingWithN: { [key: string]: string[] };
};

type PlayerType = 'parent' | 'child';

type HistoryItem = {
  word: string;
  isWrong?: boolean;
};

const ChoiceButton = ({ word, onPress, disabled }: { word: string; onPress: () => void; disabled?: boolean }) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.choiceButton,
        isPressed && styles.choiceButtonPressed,
        disabled && styles.choiceButtonDisabled
      ]}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled}
    >
      <Text style={styles.choiceButtonText}>{word}</Text>
    </TouchableOpacity>
  );
};

// 履歴表示用のコンポーネント
const HistoryDisplay = ({ history, wrongWord }: { history: HistoryItem[]; wrongWord: string }) => {
  const renderHistoryRow = (items: HistoryItem[], startIndex: number) => {
    const isFirstRow = startIndex === 0;
    const showWrongWord = wrongWord && (
      (isFirstRow && history.length <= 7) || (!isFirstRow && history.length > 7)
    );

    return (
      <View style={styles.historyRow}>
        {!isFirstRow && items.length > 0 && <Text style={styles.historyItem}> → </Text>}
        {items.map((item, index) => (
          <React.Fragment key={startIndex + index}>
            <Text
              style={[
                styles.historyItem,
                item.isWrong && styles.wrongWord,
              ]}
            >
              {item.word}
            </Text>
            {index < items.length - 1 && (
              <Text style={styles.historyItem}> → </Text>
            )}
          </React.Fragment>
        ))}
        {showWrongWord && (
          <>
            {items.length > 0 && <Text style={styles.historyItem}> → </Text>}
            <Text style={[styles.historyItem, styles.wrongWord]}>{wrongWord}</Text>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.historyContainer}>
      {renderHistoryRow(history.slice(0, 7), 0)}
      {renderHistoryRow(history.slice(7), 7)}
    </View>
  );
};

const ShiritoriGame = () => {
  const router = useRouter();
  const { isHiragana, setIsHiragana } = useGame();
  const [currentWord, setCurrentWord] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerType>('parent');
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isResult, setIsResult] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [times, setTimes] = useState<{ [key in PlayerType]: number[] }>({ parent: [], child: [] });
  const [elapsed, setElapsed] = useState(0);
  const [winner, setWinner] = useState('');
  const [wrongWord, setWrongWord] = useState('');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const textBounceAnim = useRef(new Animated.Value(0)).current;
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const shiritoriData = isHiragana ? hiraganaData as ShiritoriData : katakanaData as ShiritoriData;
  const yoonMap = isHiragana ? yoonMapHiragana : yoonMapKatakana;
  const yoonInitials = isHiragana ? yoonInitialsHiragana : yoonInitialsKatakana;

  useEffect(() => {
    initializeGame();
  }, [isHiragana]);

  useEffect(() => {
    if (isGameOver || !startTime) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, isGameOver]);

  useEffect(() => {
    if (isResult) {
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
  }, [isResult]);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const initializeGame = () => {
    const initialWord = getRandomWord();
    setCurrentWord(initialWord);
    generateChoices(initialWord);
    setStartTime(Date.now());
    setElapsed(0);
    setHistory([{ word: initialWord }]);
    setTurn(1);
    setCurrentPlayer('parent');
    setIsGameOver(false);
    setIsResult(false);
    setWinner('');
    setTimes({ parent: [], child: [] });
    setWrongWord('');
  };

  const getRandomWord = () => {
    const shiritoriWords = shiritoriData.shiritoriWords;
    const wordsEndingWithN = Object.values(shiritoriData.wordsEndingWithN).flat();
    const allWords = Object.values(shiritoriWords).flat();
    const validWords = allWords.filter(word =>
      !wordsEndingWithN.includes(word) &&
      !word.endsWith(isHiragana ? 'ん' : 'ン')
    );
    return validWords[Math.floor(Math.random() * validWords.length)];
  };

  const generateChoices = (word: string) => {
    const lastChar = word.slice(-1);
    const normalizedLastChar = yoonMap[lastChar] || lastChar;
    const shiritoriWords = shiritoriData.shiritoriWords;
    const wordsEndingWithN = shiritoriData.wordsEndingWithN;

    // 現在のモード（ひらがな/カタカナ）に基づいて単語をフィルタリング
    const filterByMode = (words: string[]) => {
      return words.filter(w => {
        const firstChar = w.charAt(0);
        const isHiraganaChar = /^[\u3040-\u309F]$/.test(firstChar);
        return isHiragana ? isHiraganaChar : !isHiraganaChar;
      });
    };

    // 通常のしりとり単語を取得
    const goWords = filterByMode(shiritoriWords[normalizedLastChar] || []);
    const goChoices = shuffle(goWords).slice(0, 2);

    // 「ん」で終わる単語を取得
    const goNWords = filterByMode(wordsEndingWithN[normalizedLastChar] || []);
    const goNChoice = shuffle(goNWords).slice(0, 1);

    // ランダムな選択肢を生成
    let allWords = filterByMode(Object.values(shiritoriWords).flat());
    const exclude = new Set([...goChoices, ...goNChoice]);
    allWords = allWords.filter(w => !exclude.has(w));
    const randomChoices = shuffle(allWords).slice(0, 7);

    const result = shuffle([...goChoices, ...goNChoice, ...randomChoices]);
    setChoices(result);
  };

  const shuffle = (array: string[]) => {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const playSound = async (type: 'correct' | 'gameOver') => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        type === 'correct'
          ? require('../../assets/sounds/OK.mp3')
          : require('../../assets/sounds/Finish.mp3')
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleChoice = (choice: string) => {
    const endTime = Date.now();
    const timeTaken = (endTime - startTime!) / 1000;
    setTimes(prev => ({
      ...prev,
      [currentPlayer]: [...prev[currentPlayer], timeTaken]
    }));
    setElapsed(0);

    if (history.some(item => item.word === choice)) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner((currentPlayer === 'parent' ? '🐶' : '🦁') + 'の勝ち！（同じ単語を繰り返した）');
      playSound('gameOver');
      return;
    }

    const prevWord = history[history.length - 1].word;
    
    // 前の単語の最後の文字を取得（拗音の場合は2文字）
    let prevLastChar = prevWord.slice(-1);
    if (prevWord.length >= 2) {
      const lastTwoChars = prevWord.slice(-2);
      if (yoonMap[lastTwoChars]) {
        prevLastChar = lastTwoChars;
      }
    }

    // 選択単語の最初の文字を取得（拗音の場合は2文字）
    let choiceFirstChar = choice.slice(0, 1);
    if (choice.length >= 2) {
      const firstTwoChars = choice.slice(0, 2);
      if (yoonMap[firstTwoChars]) {
        choiceFirstChar = firstTwoChars;
      }
    }

    // 前の単語の最後の文字が拗音の場合、対応する文字に変換
    const prevLastCharNormalized = yoonMap[prevLastChar] || prevLastChar;
    // 選択単語の最初の文字が拗音の場合、対応する文字に変換
    const choiceFirstCharNormalized = yoonMap[choiceFirstChar] || choiceFirstChar;

    // 拗音許容ロジック
    let isValid = false;
    if (choiceFirstCharNormalized === prevLastCharNormalized) {
      isValid = true;
    } else if (
      yoonInitials[prevLastCharNormalized] &&
      yoonInitials[prevLastCharNormalized].includes(choiceFirstChar)
    ) {
      // 例: 「り」→「りゃ」「りゅ」「りょ」
      isValid = true;
    }

    if (!isValid) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner((currentPlayer === 'parent' ? '🐶' : '🦁') + 'の勝ち！（相手が正しい単語を選ばなかった）');
      playSound('gameOver');
      return;
    }

    const choiceLastChar = choice.slice(-1);
    const endChar = isHiragana ? 'ん' : 'ン';
    if (choiceLastChar === endChar) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner((currentPlayer === 'parent' ? '🐶' : '🦁') + `の勝ち！（相手が「${endChar}」で終わる単語を選んだ）`);
      playSound('gameOver');
      return;
    }

    playSound('correct');
    setHistory([...history, { word: choice }]);
    setCurrentWord(choice);
    generateChoices(choice);

    if (turn >= 9) {
      setTimeout(() => {
        showResult();
      }, 500);
      setIsGameOver(true);
      return;
    }

    setCurrentPlayer(currentPlayer === 'parent' ? 'child' : 'parent');
    setTurn(prev => prev + 1);
    setStartTime(Date.now());
  };

  const showResult = () => {
    const parentTotal = times.parent.reduce((a, b) => a + b, 0);
    const childTotal = times.child.reduce((a, b) => a + b, 0);
    let winnerText = '';
    if (parentTotal < childTotal) {
      winnerText = '🦁の勝ち！';
    } else if (childTotal < parentTotal) {
      winnerText = '🐶の勝ち！';
    } else {
      winnerText = '引き分け！';
    }
    setWinner(winnerText);
    setIsResult(true);
    playSound('gameOver');
  };

  const handleRetry = () => {
    initializeGame();
  };

  const handleSwitchKana = () => {
    setIsHiragana(!isHiragana);
    handleRetry();
  };

  if (isResult) {
    const parentTotal = times.parent.reduce((a, b) => a + b, 0);
    const childTotal = times.child.reduce((a, b) => a + b, 0);
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
            currentGame="shiritori"
          />
          <HistoryDisplay history={history} wrongWord={wrongWord} />
          <View style={styles.resultsContainer}>
            <Animated.Text
              style={[
                styles.winnerEmoji,
                {
                  transform: [{
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -20],
                    }),
                  }],
                },
              ]}
            >
              <Text>{winner.includes('🦁') ? '🦁' : winner.includes('🐶') ? '🐶' : '🤝'}</Text>
            </Animated.Text>
            <Animated.Text
              style={[
                styles.winnerText,
                {
                  transform: [{
                    translateY: textBounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  }],
                },
              ]}
            >
              <Text>🎉{winner}</Text>
            </Animated.Text>
            <View style={styles.resultTimes}>
              <View style={styles.resultTimeRow}>
                <Text style={styles.playerEmoji}>🦁</Text>
                <Text style={[styles.timeText, styles.parentTime]}>
                  {parentTotal.toFixed(1)}秒
                </Text>
              </View>
              <View style={styles.resultTimeRow}>
                <Text style={styles.playerEmoji}>🐶</Text>
                <Text style={[styles.timeText, styles.childTime]}>
                  {childTotal.toFixed(1)}秒
                </Text>
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
          currentGame="shiritori"
        />
        <HistoryDisplay history={history} wrongWord={wrongWord} />
        <View style={styles.playersArea}>
          <View style={[styles.playerArea, currentPlayer === 'parent' && styles.activePlayer]}>
            <View style={styles.playerTitle}>
              <Text style={[styles.playerEmoji, currentPlayer === 'parent' && styles.activeEmoji]}>
                🦁
              </Text>
              <Text style={[styles.timeText, styles.parentTime]}>
                {(times.parent.reduce((a, b) => a + b, 0) + (currentPlayer === 'parent' ? elapsed : 0)).toFixed(1)}秒
              </Text>
            </View>
            {currentPlayer === 'parent' && (
              <View style={styles.choicesArea}>
                {choices.map((choice, index) => (
                  <ChoiceButton
                    key={index}
                    word={choice}
                    onPress={() => handleChoice(choice)}
                    disabled={isGameOver}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={[styles.playerArea, currentPlayer === 'child' && styles.activePlayer]}>
            <View style={styles.playerTitle}>
              <Text style={[styles.playerEmoji, currentPlayer === 'child' && styles.activeEmoji]}>
                🐶
              </Text>
              <Text style={[styles.timeText, styles.childTime]}>
                {(times.child.reduce((a, b) => a + b, 0) + (currentPlayer === 'child' ? elapsed : 0)).toFixed(1)}秒
              </Text>
            </View>
            {currentPlayer === 'child' && (
              <View style={styles.choicesArea}>
                {choices.map((choice, index) => (
                  <ChoiceButton
                    key={index}
                    word={choice}
                    onPress={() => handleChoice(choice)}
                    disabled={isGameOver}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </GameLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  headerButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  switchButton: {
    backgroundColor: '#2196f3',
  },
  retryButton: {
    backgroundColor: '#4caf50',
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyContainer: {
    flexDirection: 'column',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  historyItem: {
    fontSize: isSmallScreen ? 16 : 28,
    color: '#333',
    marginRight: 5,
  },
  wrongWord: {
    color: '#ff4444',
  },
  resultsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  winnerEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 10,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  resultTimes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  resultTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  activeEmoji: {
    fontSize: 32,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  parentTime: {
    color: '#ff9800',
  },
  childTime: {
    color: '#2196f3',
  },
  playersArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  playerArea: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activePlayer: {
    borderWidth: 4,
    borderColor: '#fbbc5d',
  },
  playerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  choicesArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceButton: {
    backgroundColor: '#e3f2fd',
    padding: isSmallScreen ? 8 : 12,
    paddingHorizontal: isSmallScreen ? 4 : 6,
    borderRadius: 20,
    minWidth: isSmallScreen ? 60 : 150,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderWidth: 2,
    borderColor: '#42a5f5',
    shadowColor: '#90caf9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  choiceButtonText: {
    fontSize: isSmallScreen ? 14 : 24,
    color: '#1565c0',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  choiceButtonPressed: {
    backgroundColor: '#90caf9',
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.3,
  },
  choiceButtonDisabled: {
    backgroundColor: '#e0e0e0',
    borderColor: '#bdbdbd',
    opacity: 0.7,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default ShiritoriGame; 