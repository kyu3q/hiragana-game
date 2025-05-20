import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import GameLayout from '../../components/common/GameLayout';
import { shiritoriData as hiraganaData } from '../../constants/games/shiritoriHiragana';
import { shiritoriData as katakanaData } from '../../constants/games/shiritoriKatakana';
import { styles } from '../../styles/shiritori.styles';

const { width, height } = Dimensions.get('window');

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

type ShiritoriData = {
  shiritoriWords: { [key: string]: string[] };
  wordsEndingWithN: { [key: string]: string[] };
};

type PlayerType = 'parent' | 'child';

export default function ShiritoriGame() {
  const router = useRouter();
  const [isHiragana, setIsHiragana] = useState(true);
  const [currentWord, setCurrentWord] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerType>('parent');
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isResult, setIsResult] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [times, setTimes] = useState<{ [key in PlayerType]: number[] }>({ parent: [], child: [] });
  const [elapsed, setElapsed] = useState(0);
  const [winner, setWinner] = useState('');
  const [wrongWord, setWrongWord] = useState('');
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const textBounceAnim = useRef(new Animated.Value(0)).current;

  const shiritoriData = isHiragana ? hiraganaData as ShiritoriData : katakanaData as ShiritoriData;
  const yoonMap = isHiragana ? yoonMapHiragana : yoonMapKatakana;

  useEffect(() => {
    initializeGame();
  }, []);

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

  const initializeGame = () => {
    const initialWord = getRandomWord();
    setCurrentWord(initialWord);
    generateChoices(initialWord);
    setStartTime(Date.now());
    setElapsed(0);
    setHistory([initialWord]);
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

    const goWords = (shiritoriWords[normalizedLastChar] || []).slice();
    const goChoices = shuffle(goWords).slice(0, 2);

    const goNWords = (shiritoriWords[normalizedLastChar] || [])
      .filter(w => w.endsWith(isHiragana ? 'ん' : 'ン'));
    const goNChoice = shuffle(goNWords).slice(0, 1);

    let allWords = Object.values(shiritoriWords).flat();
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

  const handleChoice = (choice: string) => {
    const endTime = Date.now();
    const timeTaken = (endTime - startTime!) / 1000;
    setTimes(prev => ({
      ...prev,
      [currentPlayer]: [...prev[currentPlayer], timeTaken]
    }));
    setElapsed(0);

    if (history.includes(choice)) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner((currentPlayer === 'parent' ? '🐶' : '🦁') + 'の勝ち！（同じ単語を繰り返した）');
      return;
    }

    const prevWord = history[history.length - 1];
    let prevLastChar = prevWord.slice(-1);
    if (prevWord.length >= 2) {
      const lastTwoChars = prevWord.slice(-2);
      if (yoonMap[lastTwoChars]) {
        prevLastChar = lastTwoChars;
      }
    }

    let choiceFirstChar = choice.slice(0, 1);
    if (choice.length >= 2) {
      const firstTwoChars = choice.slice(0, 2);
      if (yoonMap[firstTwoChars]) {
        choiceFirstChar = firstTwoChars;
      } else if (choice.length >= 3) {
        const firstThreeChars = choice.slice(0, 3);
        if (yoonMap[firstThreeChars]) {
          choiceFirstChar = firstThreeChars;
        }
      }
    }

    const prevLastCharNormalized = yoonMap[prevLastChar] || prevLastChar;
    const choiceFirstCharNormalized = yoonMap[choiceFirstChar] || choiceFirstChar;

    if (choiceFirstCharNormalized !== prevLastCharNormalized) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner((currentPlayer === 'parent' ? '🐶' : '🦁') + 'の勝ち！（相手が正しい単語を選ばなかった）');
      return;
    }

    const choiceLastChar = choice.slice(-1);
    const endChar = isHiragana ? 'ん' : 'ン';
    if (choiceLastChar === endChar) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner((currentPlayer === 'parent' ? '🐶' : '🦁') + `の勝ち！（相手が「${endChar}」で終わる単語を選んだ）`);
      return;
    }

    setHistory([...history, choice]);
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
  };

  const handleRetry = () => {
    initializeGame();
  };

  const handleSwitchGame = () => {
    setIsHiragana(!isHiragana);
    handleRetry();
  };

  if (isResult) {
    const parentTotal = times.parent.reduce((a, b) => a + b, 0);
    const childTotal = times.child.reduce((a, b) => a + b, 0);
    return (
      <GameLayout onRetry={handleRetry} onSwitchGame={handleSwitchGame}>
        <View style={styles.container}>
          <View style={styles.historyContainer}>
            {history.map((word, idx) => (
              <Text key={idx} style={styles.historyItem}>
                {word}
                {idx < history.length - 1 && ' → '}
              </Text>
            ))}
            {wrongWord && (
              <>
                <Text style={styles.historyItem}> → </Text>
                <Text style={[styles.historyItem, styles.wrongWord]}>{wrongWord}</Text>
              </>
            )}
          </View>
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
              {winner.includes('🦁') ? '🦁' : winner.includes('🐶') ? '🐶' : '🤝'}
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
              🎉{winner}
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
    <GameLayout onRetry={handleRetry} onSwitchGame={handleSwitchGame}>
      <View style={styles.container}>
        <View style={styles.historyContainer}>
          {history.map((word, idx) => (
            <Text key={idx} style={styles.historyItem}>
              {word}
              {idx < history.length - 1 && ' → '}
            </Text>
          ))}
        </View>
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
                {choices.map((choice, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.choiceButton}
                    onPress={() => handleChoice(choice)}
                  >
                    <Text style={styles.choiceText}>{choice}</Text>
                  </TouchableOpacity>
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
                {choices.map((choice, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.choiceButton}
                    onPress={() => handleChoice(choice)}
                  >
                    <Text style={styles.choiceText}>{choice}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </GameLayout>
  );
} 