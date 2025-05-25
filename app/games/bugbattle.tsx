import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { level1Words, level2Words, level3Words, level4Words, level5Words } from '../../constants/games/wordLists';
import GameLayout from '../components/GameLayout';
import GameMenu from '../components/GameMenu';

// 画面サイズの取得（グローバルで宣言）
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 768;

// 虫の種類
type BugType = 'ladybug' | 'wasp' | 'butterfly' | 'dragonfly' | 'firefly';

// 虫の絵文字マッピング
const BUG_EMOJIS = {
  ladybug: '🐞', // テントウムシ
  wasp: '🐝', // ハチ
  butterfly: '🦋', // チョウ
  dragonfly: '🦗', // トンボ
  firefly: '✨', // ホタル
} as const;

// 虫のサイズ定数
const BUG_SIZES = {
  ladybug: 40, // テントウムシの半径
  wasp: 35,    // ハチの半径
  butterfly: 45, // チョウの半径
  dragonfly: 50, // トンボの半径
  firefly: 35,  // ホタルの半径
} as const;

// 敵の種類と絵文字のマッピング
const ENEMY_EMOJIS = {
  beetle: '🪲', // カブトムシ
  stag: '🦗', // クワガタ
  mantis: '🦗', // カマキリ
} as const;

type EnemyType = keyof typeof ENEMY_EMOJIS;

// 敵のサイズ定数
const ENEMY_SIZES = {
  beetle: 45,    // カブトムシの半径
  stag: 40,      // クワガタの半径
  mantis: 35,    // カマキリの半径
} as const;

// 虫の特殊能力
interface BugAbility {
  name: string;
  description: string;
  cooldown: number;
  effect: (bug: Bug, enemies: Enemy[]) => void;
}

// 虫の状態
interface Bug {
  id: number;
  type: BugType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  rotation: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  ability: BugAbility;
  lastAbilityUse: number;
}

// 敵の状態
interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  rotation: Animated.Value;
  scale: Animated.Value;
}

// 問題の状態
interface Question {
  word: string;
  letters: string[];
  answer: string;
  slots: { id: number; letter: string | null }[];
}

// 3つの枠の状態
interface Frame {
  id: number;
  question: Question | null;
  availableLetters: string[];
}

// 難易度設定
interface Difficulty {
  level: number;
  bugSpeed: number;
  enemySpeed: number;
  enemySpawnRate: number;
  scoreMultiplier: number;
}

// パーティクルの型定義
interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  velocity: { x: number; y: number };
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
}

const DIFFICULTY_LEVELS: Difficulty[] = [
  { level: 1, bugSpeed: 0.67, enemySpeed: 2, enemySpawnRate: 0.9, scoreMultiplier: 1 },    // 90%の確率で出現
  { level: 2, bugSpeed: 0.83, enemySpeed: 2.5, enemySpawnRate: 0.95, scoreMultiplier: 1.2 }, // 95%の確率で出現
  { level: 3, bugSpeed: 1, enemySpeed: 3, enemySpawnRate: 0.98, scoreMultiplier: 1.5 },    // 98%の確率で出現
  { level: 4, bugSpeed: 1.17, enemySpeed: 3.5, enemySpawnRate: 0.99, scoreMultiplier: 2 },   // 99%の確率で出現
  { level: 5, bugSpeed: 1.33, enemySpeed: 4, enemySpawnRate: 1, scoreMultiplier: 2.5 },    // 100%の確率で出現
];

// 敵の出現間隔（ミリ秒）
const ENEMY_SPAWN_INTERVAL = 5000; // 5秒ごとに敵の出現を試みる

// サンセットの単語リスト
const SUNSET_WORDS = [
  { word: '夕日', answer: 'ゆうひ', letters: ['ゆ', 'う', 'ひ'] },
  { word: '夕焼け', answer: 'ゆうやけ', letters: ['ゆ', 'う', 'や', 'け'] },
  { word: '夕暮れ', answer: 'ゆうぐれ', letters: ['ゆ', 'う', 'ぐ', 'れ'] },
  { word: '夕空', answer: 'ゆうぞら', letters: ['ゆ', 'う', 'ぞ', 'ら'] },
  { word: '夕風', answer: 'ゆうかぜ', letters: ['ゆ', 'う', 'か', 'ぜ'] },
];

// 1枠分の新しい問題を生成する関数
const generateSingleQuestion = (usedIndices: number[], currentWordList: any[]): { question: Question; availableLetters: string[]; usedIndex: number } => {
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * currentWordList.length);
  } while (usedIndices.includes(randomIndex));
  const question = currentWordList[randomIndex];
  const slots = Array.from({ length: question.answer.length }, (_, i) => ({
    id: i,
    letter: null,
  }));
  return {
    question: {
      ...question,
      slots,
    },
    availableLetters: [...question.letters].sort(() => Math.random() - 0.5),
    usedIndex: randomIndex,
  };
};

export default function BugBattle() {
  const router = useRouter();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const bugsRef = useRef<Bug[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isHiragana, setIsHiragana] = useState(true);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [levelUpAnimation] = useState(new Animated.Value(1));
  const [comboAnimation] = useState(new Animated.Value(1));
  const [showLevelUpText, setShowLevelUpText] = useState(false);
  const [showComboText, setShowComboText] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAttacking, setIsAttacking] = useState<{[key: number]: boolean}>({});
  const [lastEnemySpawnTime, setLastEnemySpawnTime] = useState(0);
  const [draggingCard, setDraggingCard] = useState<{
    letter: string;
    position: Animated.ValueXY;
  } | null>(null);
  const [shakeAnimation] = useState(new Animated.Value(0));
  const [battleResult, setBattleResult] = useState<{
    visible: boolean;
    type: 'success' | 'failure';
    message: string;
  }>({
    visible: false,
    type: 'success',
    message: '',
  });
  const [frames, setFrames] = useState<Frame[]>([
    { id: 1, question: null, availableLetters: [] },
    { id: 2, question: null, availableLetters: [] },
    { id: 3, question: null, availableLetters: [] },
  ]);

  // 連番ID生成用ref
  const bugIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const particleIdRef = useRef<number>(0);

  // 音声の読み込み
  const [sounds, setSounds] = useState<{
    bugSpawn: Audio.Sound | null;
    enemySpawn: Audio.Sound | null;
    collision: Audio.Sound | null;
  }>({
    bugSpawn: null,
    enemySpawn: null,
    collision: null,
  });

  const createParticles = (x: number, y: number, color: string, count: number = 10, type: 'success' | 'failure' = 'success') => {
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      id: particleIdRef.current++,
      x,
      y,
      color,
      size: Math.random() * 4 + 2,
      velocity: {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
      },
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
    }));

    setParticles((prev: Particle[]) => [...prev, ...newParticles]);

    newParticles.forEach((particle: Particle) => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: type === 'success' ? 360 : -360,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setParticles((prev: Particle[]) => prev.filter((p: Particle) => p.id !== particle.id));
      });
    });
  };

  // 音声の初期化
  useEffect(() => {
    const loadSounds = async () => {
      try {
        const bugSpawnSound = new Audio.Sound();
        const enemySpawnSound = new Audio.Sound();
        const collisionSound = new Audio.Sound();

        await Promise.all([
          bugSpawnSound.loadAsync(require('../../assets/sounds/bugbattle/bug_spawn.mp3')),
          enemySpawnSound.loadAsync(require('../../assets/sounds/bugbattle/enemy_spawn.mp3')),
          collisionSound.loadAsync(require('../../assets/sounds/bugbattle/collision.mp3')),
        ]);

        setSounds({
          bugSpawn: bugSpawnSound,
          enemySpawn: enemySpawnSound,
          collision: collisionSound,
        });
      } catch (error) {
        console.error('音声の読み込みに失敗しました:', error);
      }
    };

    loadSounds();

    // クリーンアップ
    return () => {
      const cleanup = async () => {
        try {
          // すべての音声を停止
          await Promise.all(
            Object.values(sounds).map(async (sound) => {
              if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
              }
            })
          );
        } catch (error) {
          console.error('音声のクリーンアップに失敗しました:', error);
        }
      };
      cleanup();
    };
  }, []);

  // 音声再生関数
  const playSound = async (sound: Audio.Sound | null) => {
    try {
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch (error) {
      console.error('音声の再生に失敗しました:', error);
    }
  };

  // 初期化
  useEffect(() => {
    initializeGame();
    startGameLoop();
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);

  // 難易度の取得
  const getCurrentDifficulty = (): Difficulty => {
    return DIFFICULTY_LEVELS[currentLevel - 1] || DIFFICULTY_LEVELS[0];
  };

  // スコアの計算
  const calculateScore = (baseScore: number): number => {
    const difficulty = getCurrentDifficulty();
    const timeBonus = Math.max(1, 2 - gameTime / 60); // 時間ボーナス（最大2倍）
    const comboBonus = Math.min(2, 1 + consecutiveCorrect * 0.1); // コンボボーナス（最大2倍）
    return Math.floor(baseScore * difficulty.scoreMultiplier * timeBonus * comboBonus);
  };

  // レベルアップ演出
  const playLevelUpAnimation = () => {
    setShowLevelUpText(true);
    Animated.sequence([
      Animated.timing(levelUpAnimation, {
        toValue: 1.5,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(levelUpAnimation, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLevelUpText(false);
    });
  };

  // コンボ演出
  const playComboAnimation = () => {
    setShowComboText(true);
    Animated.sequence([
      Animated.timing(comboAnimation, {
        toValue: 1.3,
        duration: 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(comboAnimation, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setShowComboText(false);
      }, 500);
    });
  };

  // レベルアップ判定
  const checkLevelUp = () => {
    const nextLevel = Math.min(5, Math.floor(score / 100) + 1);
    if (nextLevel > currentLevel) {
      setCurrentLevel(nextLevel);
      playLevelUpAnimation();
    }
  };

  // ゲームの初期化
  const initializeGame = () => {
    console.log('ゲームを初期化します');
    setBugs([]);
    setEnemies([]);
    setScore(0);
    setGameOver(false);
    setCurrentLevel(1);
    setConsecutiveCorrect(0);
    setGameTime(0);
    generateQuestion();
    
    // 初期の味方を生成（少し遅延させて確実に生成されるようにする）
    setTimeout(() => {
      console.log('初期の味方を生成します');
      spawnBug();
    }, 100);
  };

  // 問題の生成
  const generateQuestion = () => {
    const wordLists = {
      1: level1Words,
      2: level2Words,
      3: level3Words,
      4: level4Words,
      5: level5Words,
    };
    const currentWordList = wordLists[1];
    // 3つの異なる単語を選ぶ
    const usedIndices: number[] = [];
    const newFrames = frames.map((frame) => {
      const { question, availableLetters, usedIndex } = generateSingleQuestion(usedIndices, currentWordList);
      usedIndices.push(usedIndex);
      return {
        ...frame,
        question,
        availableLetters,
      };
    });
    setFrames(newFrames);
  };

  // ゲームループの開始
  const startGameLoop = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    console.log('ゲームループを開始します');
    gameLoopRef.current = setInterval(async () => {
      await updateGameState();
    }, 1000 / 60) as unknown as NodeJS.Timeout;

    // 敵の生成用の別のインターバル
    setInterval(() => {
      spawnEnemy();
    }, ENEMY_SPAWN_INTERVAL);

    // 時間計測
    setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 1000);
  };

  // ゲーム状態の更新
  const updateGameState = async () => {
    // 状態の更新を同期的に行う
    await Promise.all([
      updateBugs(),
      updateEnemies()
    ]);
    
    // 最新の状態を取得して衝突判定を実行
    checkCollisions();
  };

  // 虫の位置更新
  const updateBugs = () => {
    return new Promise<void>((resolve) => {
      setBugs(prevBugs => {
        const updatedBugs = prevBugs.map(bug => {
          // 左方向に直線移動
          const newX = bug.x - bug.speed;
          return {
            ...bug,
            x: newX,
          };
        }).filter(bug => bug.x > -100); // 画面外に出た虫を削除
        bugsRef.current = updatedBugs;
        resolve();
        return updatedBugs;
      });
    });
  };

  // 敵の位置更新
  const updateEnemies = () => {
    return new Promise<void>((resolve) => {
      setEnemies(prevEnemies => {
        const updatedEnemies = prevEnemies.map(enemy => {
          // 右方向に直線移動
          const newX = enemy.x + enemy.speed;
          return {
            ...enemy,
            x: newX,
          };
        }).filter(enemy => enemy.x < screenWidth + 100); // 画面外に出た敵を削除
        enemiesRef.current = updatedEnemies;
        resolve();
        return updatedEnemies;
      });
    });
  };

  // 衝突判定
  const checkCollision = (bug: Bug, enemy: Enemy) => {
    // 中心点の距離を計算
    const dx = bug.x - enemy.x;
    const dy = bug.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 虫の大きさを考慮した衝突判定
    const bugRadius = BUG_SIZES[bug.type];
    const enemyRadius = ENEMY_SIZES[enemy.type];
    const collisionThreshold = (bugRadius + enemyRadius) * 1.2; // 衝突判定の距離を20%増加
    
    return distance < collisionThreshold;
  };

  // 衝突判定と処理
  const checkCollisions = () => {
    // 最新の状態を取得
    const currentBugs = bugsRef.current;
    const currentEnemies = enemiesRef.current;
    
    currentBugs.forEach(bug => {
      currentEnemies.forEach(enemy => {
        if (checkCollision(bug, enemy)) {
          // 攻撃アニメーション
          playAttackAnimation(enemy.id);

          // 結果をランダムに決定（50%の確率で成功）
          const isSuccess = Math.random() > 0.5;

          // パーティクルエフェクト（成功時は緑、失敗時は赤）
          createParticles(
            (bug.x + enemy.x) / 2,
            (bug.y + enemy.y) / 2,
            isSuccess ? '#4CAF50' : '#F44336',
            30,
            isSuccess ? 'success' : 'failure'
          );

          // 衝突音
          playSound(sounds.collision);

          // スコア減少
          const difficulty = getCurrentDifficulty();
          const penalty = Math.floor(5 * difficulty.scoreMultiplier);
          setScore(prev => Math.max(0, prev - penalty));

          // 虫の消滅アニメーション
          animateBugDisappearance(bug);

          // 敵の消滅アニメーション
          animateEnemyDisappearance(enemy);

          // 画面シェイク
          shakeScreen();
        }
      });
    });
  };

  // 虫の消滅アニメーション
  const animateBugDisappearance = (bug: Bug) => {
    console.log('虫の消滅アニメーション開始:', bug.id);
    Animated.parallel([
      Animated.timing(bug.scale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(bug.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('虫の消滅完了:', bug.id);
      setBugs(prev => prev.filter(b => b.id !== bug.id));
    });
  };

  // 敵の消滅アニメーション
  const animateEnemyDisappearance = (enemy: Enemy) => {
    console.log('敵の消滅アニメーション開始:', enemy.id);
    Animated.parallel([
      Animated.timing(enemy.scale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('敵の消滅完了:', enemy.id);
      setEnemies(prev => prev.filter(e => e.id !== enemy.id));
    });
  };

  // 攻撃アニメーション
  const playAttackAnimation = (id: number) => {
    setIsAttacking(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setIsAttacking(prev => ({ ...prev, [id]: false }));
    }, 500);
  };

  const handleRetry = () => {
    initializeGame();
  };

  const handleSwitchKana = () => {
    setIsHiragana(!isHiragana);
  };

  // 虫の生成
  const spawnBug = () => {
    console.log('spawnBug関数が呼び出されました');
    const difficulty = getCurrentDifficulty();
    const bugTypes: BugType[] = ['ladybug', 'wasp', 'butterfly', 'dragonfly', 'firefly'];
    const bugType = bugTypes[Math.floor(Math.random() * bugTypes.length)];
    bugIdRef.current += 1;
    const newBug: Bug = {
      id: bugIdRef.current,
      type: bugType,
      x: screenWidth + 50,
      y: screenHeight - 600,
      targetX: 0,
      targetY: 0,
      speed: difficulty.bugSpeed,
      rotation: new Animated.Value(0),
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      ability: BUG_ABILITIES[bugType],
      lastAbilityUse: 0,
    };
    setBugs(prevBugs => {
      const newBugs = [...prevBugs, newBug];
      bugsRef.current = newBugs;
      return newBugs;
    });
    playSound(sounds.bugSpawn);
  };

  // 敵の生成
  const spawnEnemy = () => {
    const difficulty = getCurrentDifficulty();
    // 現在の敵の数をチェック
    const currentEnemyCount = enemiesRef.current.length;
    const maxEnemies = 10; // 最大敵数を10に増やす

    // 最大敵数に達している場合は生成しない
    if (currentEnemyCount >= maxEnemies) {
      console.log('最大敵数に達しているため、新しい敵は生成しません');
      return;
    }

    if (Math.random() > difficulty.enemySpawnRate) {
      console.log('敵の生成をスキップしました');
      return;
    }

    const enemyTypes = Object.keys(ENEMY_EMOJIS) as EnemyType[];
    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    enemyIdRef.current += 1;
    const newEnemy: Enemy = {
      id: enemyIdRef.current,
      type: enemyType,
      x: -50,
      y: screenHeight - 600,
      targetX: 0,
      targetY: 0,
      speed: difficulty.enemySpeed,
      rotation: new Animated.Value(0),
      scale: new Animated.Value(1),
    };

    setEnemies(prevEnemies => {
      const newEnemies = [...prevEnemies, newEnemy];
      enemiesRef.current = newEnemies;
      return newEnemies;
    });
    playSound(sounds.enemySpawn);
  };

  // 答えの確認
  const checkAnswer = (frameIndex: number, slots: { id: number; letter: string | null }[]) => {
    if (!frames[frameIndex]?.question) return;
    const wordLists = {
      1: level1Words,
      2: level2Words,
      3: level3Words,
      4: level4Words,
      5: level5Words,
    };
    const currentWordList = wordLists[1];
    // 既に使われている単語のインデックスを取得
    const usedIndices = frames.map(f => {
      if (!f.question) return -1;
      return currentWordList.findIndex(w => w.answer === f.question!.answer);
    }).filter(idx => idx !== -1 && idx !== undefined && idx !== null && idx !== frameIndex);

    const answer = slots.map(slot => slot.letter).join('');
    if (answer === frames[frameIndex].question.answer) {
      // 正解の場合
      const baseScore = 10;
      const finalScore = calculateScore(baseScore);
      setScore(prev => {
        const newScore = prev + finalScore;
        if (newScore > highScore) {
          setHighScore(newScore);
        }
        return newScore;
      });
      setConsecutiveCorrect(prev => {
        const newCombo = prev + 1;
        if (newCombo > 1) {
          playComboAnimation();
        }
        return newCombo;
      });
      // 必ず味方を出現させる
      setTimeout(() => {
        spawnBug();
      }, 100);
      checkLevelUp();
      // 該当枠のみ新しい問題に差し替え
      const { question, availableLetters, usedIndex } = generateSingleQuestion(usedIndices, currentWordList);
      setFrames(prevFrames => prevFrames.map((frame, idx) =>
        idx === frameIndex
          ? { ...frame, question, availableLetters }
          : frame
      ));
    } else {
      // 不正解の場合
      setConsecutiveCorrect(0);
      // カードを元に戻す
      const letters = slots.map(slot => slot.letter).filter((letter): letter is string => letter !== null);
      setFrames(prevFrames =>
        prevFrames.map((frame, idx) =>
          idx === frameIndex
            ? {
                ...frame,
                question: frame.question
                  ? {
                      ...frame.question,
                      slots: frame.question.slots.map(slot => ({ ...slot, letter: null })),
                    }
                  : null,
                availableLetters: [...frame.availableLetters, ...letters],
              }
            : frame
        )
      );
    }
  };

  const shakeScreen = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showBattleResult = (type: 'success' | 'failure', message: string) => {
    setBattleResult({
      visible: true,
      type,
      message,
    });
    setTimeout(() => {
      setBattleResult({
        visible: false,
        type: 'success',
        message: '',
      });
    }, 2000);
  };

  // 文字カードのクリック処理
  const handleLetterPress = (frameIndex: number, letter: string) => {
    if (!frames[frameIndex]?.question) return;
    // 空いているスロットを探す
    const emptySlotIndex = frames[frameIndex].question.slots.findIndex(slot => slot.letter === null);
    if (emptySlotIndex !== -1) {
      // 空いているスロットに文字を配置
      setFrames(prevFrames =>
        prevFrames.map((frame, idx) =>
          idx === frameIndex
            ? {
                ...frame,
                question: frame.question
                  ? {
                      ...frame.question,
                      slots: frame.question.slots.map((slot, i) =>
                        i === emptySlotIndex ? { ...slot, letter } : slot
                      ),
                    }
                  : null,
                availableLetters: frame.availableLetters.filter(l => l !== letter),
              }
            : frame
        )
      );
      // すべてのスロットが埋まったら判定
      const updatedSlots = frames[frameIndex].question.slots.map((slot, index) =>
        index === emptySlotIndex ? { ...slot, letter } : slot
      );
      if (updatedSlots.every(slot => slot.letter !== null)) {
        checkAnswer(frameIndex, updatedSlots);
      }
    }
  };

  // 特殊能力を使用する関数を追加
  const useAbility = (bug: Bug) => {
    const now = Date.now();
    if (now - bug.lastAbilityUse < bug.ability.cooldown) {
      return;
    }

    bug.ability.effect(bug, enemiesRef.current);
    setBugs(prevBugs =>
      prevBugs.map(b =>
        b.id === bug.id ? { ...b, lastAbilityUse: now } : b
      )
    );
  };

  // 特殊能力の定義
  const BUG_ABILITIES: Record<BugType, BugAbility> = {
    ladybug: {
      name: '防御強化',
      description: '一時的に防御力が上がり、敵の攻撃を軽減します',
      cooldown: 10000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 防御力上昇のエフェクト
        Animated.sequence([
          Animated.timing(bug.scale, {
            toValue: 1.5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(bug.scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      },
    },
    wasp: {
      name: '毒針',
      description: '敵に毒ダメージを与えます',
      cooldown: 15000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 最も近い敵に毒ダメージを与える
        const nearestEnemy = enemies.reduce((nearest, current) => {
          const nearestDist = Math.sqrt(
            Math.pow(nearest.x - bug.x, 2) + Math.pow(nearest.y - bug.y, 2)
          );
          const currentDist = Math.sqrt(
            Math.pow(current.x - bug.x, 2) + Math.pow(current.y - bug.y, 2)
          );
          return currentDist < nearestDist ? current : nearest;
        });
        if (nearestEnemy) {
          createParticles(nearestEnemy.x, nearestEnemy.y, '#4CAF50', 20, 'success');
        }
      },
    },
    butterfly: {
      name: '花粉散布',
      description: '周囲の味方を回復します',
      cooldown: 20000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 回復エフェクト
        createParticles(bug.x, bug.y, '#FFD700', 30, 'success');
      },
    },
    dragonfly: {
      name: '高速移動',
      description: '一時的に移動速度が上がります',
      cooldown: 12000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 速度上昇エフェクト
        bug.speed *= 2;
        setTimeout(() => {
          bug.speed /= 2;
        }, 3000);
      },
    },
    firefly: {
      name: '光の障壁',
      description: '周囲に光の障壁を展開し、敵の接近を防ぎます',
      cooldown: 25000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 光の障壁エフェクト
        createParticles(bug.x, bug.y, '#FFA500', 40, 'success');
      },
    },
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
          currentGame="bugbattle"
        />

        <View style={[styles.gameArea, { height: screenHeight - 400 }]}>
          {/* レベルアップ演出 */}
          {showLevelUpText && (
            <Animated.View
              style={[
                styles.levelUpContainer,
                {
                  transform: [{ scale: levelUpAnimation }],
                },
              ]}
            >
              <Text style={styles.levelUpText}>
                レベルアップ！
              </Text>
            </Animated.View>
          )}

          {/* コンボ演出 */}
          {showComboText && (
            <Animated.View
              style={[
                styles.comboContainer,
                {
                  transform: [{ scale: comboAnimation }],
                },
              ]}
            >
              <Text style={styles.comboText}>
                {consecutiveCorrect}コンボ！
              </Text>
            </Animated.View>
          )}

          {/* パーティクルエフェクト */}
          {particles.map(particle => (
            <Animated.View
              key={particle.id}
              style={[
                styles.particle,
                {
                  left: particle.x,
                  top: particle.y,
                  backgroundColor: particle.color,
                  width: particle.size,
                  height: particle.size,
                  opacity: particle.opacity,
                  transform: [
                    { scale: particle.scale },
                    { rotate: particle.rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg']
                    })}
                  ],
                },
              ]}
            />
          ))}

          {/* 敵の表示 */}
          {enemies.map(enemy => (
            <Animated.View
              key={enemy.id}
              style={[
                styles.enemy,
                {
                  left: enemy.x,
                  top: enemy.y,
                  transform: [
                    { scale: isAttacking[enemy.id] ? 1.8 : enemy.scale },
                  ],
                },
              ]}
            >
              <Text style={styles.enemyEmoji}>
                {ENEMY_EMOJIS[enemy.type]}
              </Text>
            </Animated.View>
          ))}

          {/* 虫の表示 */}
          {bugs.map(bug => (
            <React.Fragment key={bug.id}>
              <Animated.View
                style={[
                  styles.bug,
                  {
                    backgroundColor: bug.type === 'ladybug' ? '#e74c3c' : bug.type === 'wasp' ? '#f1c40f' : '#9b59b6',
                    left: bug.x,
                    top: bug.y,
                    transform: [
                      { scale: bug.scale },
                    ],
                    opacity: bug.opacity,
                  },
                ]}
              >
                <Text style={styles.bugEmoji}>
                  {BUG_EMOJIS[bug.type]}
                </Text>
              </Animated.View>
              <TouchableOpacity
                style={[
                  styles.abilityButton,
                  {
                    left: bug.x + 50,
                    top: bug.y + 50,
                  },
                ]}
                onPress={() => useAbility(bug)}
                disabled={Date.now() - bug.lastAbilityUse < bug.ability.cooldown}
              >
                <Text style={styles.abilityButtonText}>
                  {bug.ability.name}
                </Text>
                {Date.now() - bug.lastAbilityUse < bug.ability.cooldown && (
                  <View style={styles.abilityCooldown}>
                    <Text style={styles.abilityCooldownText}>
                      {Math.ceil((bug.ability.cooldown - (Date.now() - bug.lastAbilityUse)) / 1000)}s
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <View style={[styles.questionArea, { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 }]}>
          {/* 3つの枠 */}
          <View style={styles.framesContainer}>
            {frames.map((frame, frameIndex) => (
              <View
                key={frame.id}
                style={styles.frame}
              >
                <View style={styles.frameContent}>
                  {frame.question ? (
                    <>
                      <Text style={styles.bugPreview}>
                        {BUG_EMOJIS[frame.id === 1 ? 'ladybug' : frame.id === 2 ? 'wasp' : 'butterfly']}
                      </Text>
                      <View style={styles.slotsContainer}>
                        {frame.question.slots.map((slot, index) => (
                          <View
                            key={`slot-${index}`}
                            style={[styles.letterSlot, slot.letter ? styles.filledSlot : null]}
                          >
                            {slot.letter && (
                              <Text style={styles.letterSlotText}>{slot.letter}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                      {/* 利用可能な文字（各枠ごと）をスロットの下に移動 */}
                      <View style={styles.availableLettersContainer}>
                        {frame.availableLetters.map((letter, index) => (
                          <TouchableOpacity
                            key={`available-${index}`}
                            style={styles.availableLetter}
                            onPress={() => handleLetterPress(frameIndex, letter)}
                          >
                            <Text style={styles.availableLetterText}>{letter}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  ) : (
                    <Text style={styles.frameText}>枠 {frame.id}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </GameLayout>
  );
}

// --- ここからスタイル定義 ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 10,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e8f4f8',
    marginBottom: 20,
  },
  questionArea: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  questionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  answerArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    padding: 10,
    minHeight: 200,
    position: 'relative',
  },
  letterCard: {
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
  letterCardText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  selectedLetterCard: {
    backgroundColor: '#2c5282',
  },
  scoreText: {
    fontSize: isSmallScreen ? 16 : 20,
    textAlign: 'center',
    marginTop: 10,
  },
  bug: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2,
  },
  bugEmoji: {
    fontSize: 50,
  },
  enemy: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2,
  },
  enemyText: {
    color: 'white',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: 'bold',
  },
  levelText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
    color: '#4a90e2',
  },
  comboText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  levelUpContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(74, 144, 226, 0.9)',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  levelUpText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comboContainer: {
    position: 'absolute',
    top: 100,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(226, 132, 74, 0.9)',
    padding: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  particle: {
    position: 'absolute',
    borderRadius: 50,
  },
  particleEmoji: {
    fontSize: 30,
  },
  enemyEmoji: {
    fontSize: 70,
  },
  confirmButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#4a90e2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  framesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    height: '100%',
  },
  frame: {
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: '#4a90e2',
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  frameContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  frameText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  bugPreview: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 40,
  },
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: 5,
    marginTop: 10,
  },
  letterSlot: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#4a90e2',
    borderRadius: 8,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  filledSlot: {
    backgroundColor: '#4a90e2',
  },
  letterSlotText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
  },
  battleResultContainer: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  battleResultText: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  availableLettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
    marginTop: 20,
    width: '100%',
    minHeight: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
  },
  availableLetter: {
    width: 35,
    height: 35,
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  availableLetterText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  abilityButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  abilityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  abilityCooldown: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  abilityCooldownText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 