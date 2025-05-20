import { useCallback, useEffect, useState } from 'react';
import { shiritoriData } from '../constants/games/shiritoriHiragana';

export const useShiritoriGame = () => {
  const [currentWord, setCurrentWord] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'parent' | 'child'>('parent');
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isResult, setIsResult] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [times, setTimes] = useState<{ parent: number[]; child: number[] }>({ parent: [], child: [] });
  const [elapsed, setElapsed] = useState(0);
  const [winner, setWinner] = useState('');
  const [wrongWord, setWrongWord] = useState('');

  // 経過時間の更新
  useEffect(() => {
    if (isGameOver || !startTime) return;
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, isGameOver]);

  const initializeGame = useCallback(() => {
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
  }, []);

  const getRandomWord = useCallback(() => {
    const shiritoriWords = shiritoriData.shiritoriWords;
    const wordsEndingWithN = Object.values(shiritoriData.wordsEndingWithN).flat();
    const allWords = Object.values(shiritoriWords).flat();
    const validWords = allWords.filter(word =>
      !wordsEndingWithN.includes(word) &&
      !word.endsWith('ん')
    );
    return validWords[Math.floor(Math.random() * validWords.length)];
  }, []);

  const generateChoices = useCallback((word: string) => {
    const lastChar = word.slice(-1);
    const shiritoriWords = shiritoriData.shiritoriWords;
    const wordsEndingWithN = shiritoriData.wordsEndingWithN;

    // 1. 最後の文字から始まる単語2個
    const goWords = (shiritoriWords[lastChar] || []).slice();
    const goChoices = shuffle(goWords).slice(0, 2);

    // 2. 最後の文字から始まり「ん」で終わる単語1個
    const goNWords = (shiritoriWords[lastChar] || []).filter(w => w.endsWith('ん'));
    const goNChoice = shuffle(goNWords).slice(0, 1);

    // 3. ランダム7個
    let allWords = Object.values(shiritoriWords).flat();
    const exclude = new Set([...goChoices, ...goNChoice]);
    allWords = allWords.filter(w => !exclude.has(w));
    const randomChoices = shuffle(allWords).slice(0, 7);

    // 合成してシャッフル
    const result = shuffle([...goChoices, ...goNChoice, ...randomChoices]);
    setChoices(result);
  }, []);

  const shuffle = useCallback((array: string[]) => {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const handleChoice = useCallback((choice: string) => {
    const endTime = Date.now();
    const timeTaken = (endTime - (startTime || endTime)) / 1000;

    setTimes(prev => ({
      ...prev,
      [currentPlayer]: [...prev[currentPlayer], timeTaken]
    }));
    setElapsed(0);

    if (history.includes(choice)) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner(`${currentPlayer === 'parent' ? '🦁' : '🐶'}の勝ち！（同じ単語を繰り返した）`);
      return;
    }

    const prevWord = history[history.length - 1];
    const prevLastChar = prevWord.slice(-1);
    const choiceFirstChar = choice.slice(0, 1);

    if (choiceFirstChar !== prevLastChar) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner(`${currentPlayer === 'parent' ? '🦁' : '🐶'}の勝ち！（相手が正しい単語を選ばなかった）`);
      return;
    }

    if (choice.endsWith('ん')) {
      setWrongWord(choice);
      setIsGameOver(true);
      setIsResult(true);
      setWinner(`${currentPlayer === 'parent' ? '🦁' : '🐶'}の勝ち！（相手が「ん」で終わる単語を選んだ）`);
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
  }, [currentPlayer, history, startTime, turn, generateChoices]);

  const showResult = useCallback(() => {
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
  }, [times]);

  return {
    currentWord,
    choices,
    currentPlayer,
    turn,
    history,
    isGameOver,
    isResult,
    elapsed,
    winner,
    wrongWord,
    times,
    initializeGame,
    handleChoice,
  };
}; 