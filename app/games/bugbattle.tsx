import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import BugCastleIcon from '../../assets/images/BugCastleIcon';
import EnemyCastleIcon from '../../assets/images/EnemyCastleIcon';
import {
  katakanaLevel1Words,
  katakanaLevel2Words,
  katakanaLevel3Words,
  katakanaLevel4Words,
  katakanaLevel5Words,
  level1Words,
  level2Words,
  level3Words,
  level4Words,
  level5Words
} from '../../constants/games/wordLists';
import GameLayout from '../components/GameLayout';
import GameMenu from '../components/GameMenu';

// 画面サイズの取得（グローバルで宣言）
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 768;

// 虫の種類
type BugType = 'ladybug' | 'wasp' | 'butterfly' | 'firefly';

// 虫の絵文字マッピング
const BUG_EMOJIS = {
  ladybug: '🐞', // テントウムシ
  wasp: '🐝', // ハチ
  butterfly: '🦋', // チョウ
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
  beetle: '🍊', // カブトムシ
  stag: '🍎', // クワガタ
  mantis: '🍏', // カマキリ
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
  hp: number;
  maxHp: number;
  defense: number;
  baseDefense: number;
  isDefenseBoosted: boolean;
  defenseBoostTimer: number | null;
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
  hp: number;
  maxHp: number;
  attack: number;
  isPoisoned: boolean;
  poisonTimer: number | null;
  poisonDamage: number;
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
  question: string | null;
  letters: string[];
  slots: (string | null)[];
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

// タワーの型定義を追加
interface Tower {
  hp: number;
  maxHp: number;
  x: number;
  y: number;
}

const DIFFICULTY_LEVELS: Difficulty[] = [
  { level: 1, bugSpeed: 0.67, enemySpeed: 1.2, enemySpawnRate: 0.9, scoreMultiplier: 1 },    // 90%の確率で出現
  { level: 2, bugSpeed: 0.83, enemySpeed: 1.5, enemySpawnRate: 0.95, scoreMultiplier: 1.2 }, // 95%の確率で出現
  { level: 3, bugSpeed: 1, enemySpeed: 1.8, enemySpawnRate: 0.98, scoreMultiplier: 1.5 },    // 98%の確率で出現
  { level: 4, bugSpeed: 1.17, enemySpeed: 2.1, enemySpawnRate: 0.99, scoreMultiplier: 2 },   // 99%の確率で出現
  { level: 5, bugSpeed: 1.33, enemySpeed: 2.4, enemySpawnRate: 1, scoreMultiplier: 2.5 },    // 100%の確率で出現
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
const generateSingleQuestion = (usedIndices: number[], currentWordList: string[]): { question: string; letters: string[]; slots: (string | null)[]; usedIndex: number } => {
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * currentWordList.length);
  } while (usedIndices.includes(randomIndex));
  const word = currentWordList[randomIndex];
  const letters = word.split('').sort(() => Math.random() - 0.5);
  const slots = Array(word.length).fill(null);
  return {
    question: word,
    letters,
    slots,
    usedIndex: randomIndex,
  };
};

// 枠と虫の種類のマッピング
const FRAME_BUG_TYPES: Record<number, BugType> = {
  1: 'ladybug',  // 1番目の枠はテントウムシ
  2: 'wasp',     // 2番目の枠はハチ
  3: 'butterfly', // 3番目の枠はチョウ
};

// 虫の色の定義を追加
const BUG_COLORS = {
  ladybug: '#e74c3c',
  wasp: '#f1c40f',
  butterfly: '#9b59b6',
  firefly: '#4a90e2',
} as const;

// タワーの幅を定数で定義
const TOWER_WIDTH = 120;

// wordListsの型をstring[]に統一
const getWordLists = (isHiragana: boolean) => isHiragana ? {
  1: (level1Words as string[]),
  2: (level2Words as string[]),
  3: (level3Words as string[]),
  4: (level4Words as string[]),
  5: (level5Words as string[]),
} : {
  1: (katakanaLevel1Words as string[]),
  2: (katakanaLevel2Words as string[]),
  3: (katakanaLevel3Words as string[]),
  4: (katakanaLevel4Words as string[]),
  5: (katakanaLevel5Words as string[]),
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
    { id: 1, question: null, letters: [], slots: [] },
    { id: 2, question: null, letters: [], slots: [] },
    { id: 3, question: null, letters: [], slots: [] },
  ]);
  const [progressToNextLevel, setProgressToNextLevel] = useState(0);
  const [showScoreAnimation, setShowScoreAnimation] = useState(false);
  const [scoreAnimationValue] = useState(new Animated.Value(1));

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

  const [playerTower, setPlayerTower] = useState<Tower>({
    hp: 1000,
    maxHp: 1000,
    x: -100,
    y: screenHeight - 400,
  });
  const [enemyTower, setEnemyTower] = useState<Tower>({
    hp: 1000,
    maxHp: 1000,
    x: screenWidth - 50,
    y: screenHeight - 400,
  });

  // タワーのアニメーション用stateを追加
  const [playerTowerShake] = useState(new Animated.Value(0));
  const [enemyTowerShake] = useState(new Animated.Value(0));
  const [playerTowerHit, setPlayerTowerHit] = useState(false);
  const [enemyTowerHit, setEnemyTowerHit] = useState(false);

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
      spawnBug(FRAME_BUG_TYPES[1]);
    }, 100);
  };

  // 問題の生成
  const generateQuestion = () => {
    const usedIndices: number[] = [];
    const newFrames = frames.map((frame) => {
      const { question, letters, slots, usedIndex } = generateSingleQuestion(usedIndices, getWordLists(isHiragana)[1]);
      usedIndices.push(usedIndex);
      return {
        ...frame,
        question,
        letters,
        slots,
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
    const now = Date.now();

    // 状態の更新を同期的に行う
    await Promise.all([
      updateBugs(),
      updateEnemies()
    ]);
    
    // 特殊効果の更新
    setBugs(prevBugs => {
      return prevBugs.map(bug => {
        // 防御強化の効果時間チェック
        if (bug.isDefenseBoosted && bug.defenseBoostTimer && now > bug.defenseBoostTimer) {
          bug.defense = bug.baseDefense;
          bug.isDefenseBoosted = false;
          bug.defenseBoostTimer = null;
        }
        return bug;
      });
    });

    setEnemies(prevEnemies => {
      return prevEnemies.map(enemy => {
        // 毒ダメージの処理
        if (enemy.isPoisoned && enemy.poisonTimer && now > enemy.poisonTimer) {
          enemy.isPoisoned = false;
          enemy.poisonTimer = null;
          enemy.poisonDamage = 0;
        } else if (enemy.isPoisoned) {
          enemy.hp -= enemy.poisonDamage;
          if (enemy.hp <= 0) {
            // 敵の消滅処理
            animateEnemyDisappearance(enemy);
            return null;
          }
        }
        return enemy;
      }).filter((enemy): enemy is Enemy => enemy !== null);
    });
    
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
        }).filter(bug => bug.x > -200); // 画面外に出た虫を削除（判定を緩める）
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
        }).filter(enemy => enemy.x < screenWidth + 400); // 画面外に出た敵を削除（さらに緩める）
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
    const currentBugs = bugsRef.current;
    const currentEnemies = enemiesRef.current;
    
    currentBugs.forEach(bug => {
      // 味方のタワーとの衝突判定
      if (bug.x <= 40 + TOWER_WIDTH) { // 左タワーの右端
        updateTowerHp(true, 10);
        animateBugDisappearance(bug);
        return;
      }

      currentEnemies.forEach(enemy => {
        if (checkCollision(bug, enemy)) {
          // 既存の衝突処理
          playAttackAnimation(enemy.id);
          const damage = Math.max(1, enemy.attack - bug.defense);
          bug.hp -= damage;
          createParticles(
            (bug.x + enemy.x) / 2,
            (bug.y + enemy.y) / 2,
            bug.hp <= 0 ? '#F44336' : '#4CAF50',
            30,
            bug.hp <= 0 ? 'failure' : 'success'
          );
          playSound(sounds.collision);
          const difficulty = getCurrentDifficulty();
          const penalty = Math.floor(5 * difficulty.scoreMultiplier);
          setScore(prev => Math.max(0, prev - penalty));

          if (bug.hp <= 0) {
            animateBugDisappearance(bug);
          }
          if (enemy.hp <= 0) {
            animateEnemyDisappearance(enemy);
          }
          shakeScreen();
        }
      });
    });

    currentEnemies.forEach(enemy => {
      // 敵のタワーとの衝突判定
      if (enemy.x >= screenWidth - 40 - TOWER_WIDTH) { // 右タワーの左端
        updateTowerHp(false, 10);
        animateEnemyDisappearance(enemy);
        return;
      }
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
    setIsHiragana(prev => {
      const next = !prev;
      setTimeout(() => {
        initializeGame();
      }, 0);
      return next;
    });
  };

  // 虫の生成
  const spawnBug = (bugType: BugType) => {
    console.log('spawnBug関数が呼び出されました');
    const difficulty = getCurrentDifficulty();
    bugIdRef.current += 1;
    const newBug: Bug = {
      id: bugIdRef.current,
      type: bugType,
      x: screenWidth - 200, // 画面内からスタート
      y: 250, // タワーの下に表示
      targetX: 0,
      targetY: 0,
      speed: difficulty.bugSpeed,
      rotation: new Animated.Value(0),
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      ability: BUG_ABILITIES[bugType],
      lastAbilityUse: 0,
      hp: 100,
      maxHp: 100,
      defense: 10,
      baseDefense: 10,
      isDefenseBoosted: false,
      defenseBoostTimer: null,
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
    const currentEnemyCount = enemiesRef.current.length;
    const maxEnemies = 10;

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
      x: 150,
      y: 270,
      targetX: 0,
      targetY: 0,
      speed: difficulty.enemySpeed,
      rotation: new Animated.Value(0),
      scale: new Animated.Value(1),
      hp: 50,
      maxHp: 50,
      attack: 15,
      isPoisoned: false,
      poisonTimer: null,
      poisonDamage: 0,
    };

    setEnemies(prevEnemies => {
      const newEnemies = [...prevEnemies, newEnemy];
      enemiesRef.current = newEnemies;
      return newEnemies;
    });
    playSound(sounds.enemySpawn);
  };

  // 答えの確認
  const checkAnswer = (frameIndex: number, slots: string[]) => {
    if (!frames[frameIndex]?.question) return;
    const usedIndices = frames.map(f => {
      if (!f.question) return -1;
      return getWordLists(isHiragana)[1].findIndex(w => w === f.question);
    }).filter(idx => idx !== -1 && idx !== undefined && idx !== null && idx !== frameIndex);

    const answer = slots.join('');
    if (answer === frames[frameIndex].question) {
      // 正解の場合
      const baseScore = 10;
      const finalScore = calculateScore(baseScore);
      setScore(prev => {
        const updatedScore = prev + finalScore;
        if (updatedScore > highScore) {
          setHighScore(updatedScore);
        }
        return updatedScore;
      });
      setConsecutiveCorrect(prev => {
        const newCombo = prev + 1;
        if (newCombo > 1) {
          playComboAnimation();
        }
        return newCombo;
      });
      // 該当枠のみ新しい問題に差し替え
      const { question, letters, slots: newSlots, usedIndex } = generateSingleQuestion(usedIndices, getWordLists(isHiragana)[1]);
      setFrames(prevFrames => prevFrames.map((frame, idx) =>
        idx === frameIndex
          ? { ...frame, question, letters, slots: newSlots }
          : frame
      ));
      checkLevelUp();
    } else {
      // 不正解の場合
      setConsecutiveCorrect(0);
      setFrames(prevFrames =>
        prevFrames.map((frame, idx) =>
          idx === frameIndex
            ? {
                ...frame,
                slots: frame.slots.map(() => null),
                letters: [...frame.letters, ...slots.filter(l => l !== null)],
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
    const emptySlotIndex = frames[frameIndex].slots.findIndex(slot => slot === null);
    if (emptySlotIndex !== -1) {
      // 空いているスロットに文字を配置
      setFrames(prevFrames =>
        prevFrames.map((frame, idx) =>
          idx === frameIndex
            ? {
                ...frame,
                slots: frame.slots.map((l, i) => i === emptySlotIndex ? letter : l),
                letters: frame.letters.filter(l => l !== letter),
              }
            : frame
        )
      );
      // すべてのスロットが埋まったら判定
      const updatedSlots = frames[frameIndex].slots.map((l, i) => i === emptySlotIndex ? letter : l);
      if (updatedSlots.every(l => l !== null)) {
        checkAnswer(frameIndex, updatedSlots as string[]);
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
      description: '一時的に防御力が2倍になり、敵の攻撃を軽減します',
      cooldown: 10000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 防御力上昇のエフェクト
        bug.defense = bug.baseDefense * 2;
        bug.isDefenseBoosted = true;
        bug.defenseBoostTimer = Date.now() + 5000; // 5秒間効果持続

        Animated.sequence([
          Animated.timing(bug.scale, {
            toValue: 1.5,
            duration: 300,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(bug.scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();

        // 防御強化のパーティクルエフェクト
        createParticles(bug.x, bug.y, '#4a90e2', 20, 'success');
      },
    },
    wasp: {
      name: '毒針',
      description: '最も近い敵に毒ダメージを与えます（5秒間、毎秒10ダメージ）',
      cooldown: 15000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 最も近い敵を探す
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
          // 毒状態を付与
          nearestEnemy.isPoisoned = true;
          nearestEnemy.poisonTimer = Date.now() + 5000; // 5秒間効果持続
          nearestEnemy.poisonDamage = 10; // 毎秒10ダメージ

          // 毒のパーティクルエフェクト
          createParticles(nearestEnemy.x, nearestEnemy.y, '#4CAF50', 20, 'success');
        }
      },
    },
    butterfly: {
      name: '花粉散布',
      description: '周囲の味方を回復します（HPを30%回復）',
      cooldown: 20000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 周囲の味方を回復
        setBugs(prevBugs => {
          return prevBugs.map(b => {
            const distance = Math.sqrt(
              Math.pow(b.x - bug.x, 2) + Math.pow(b.y - bug.y, 2)
            );
            if (distance < 200) { // 200px以内の味方を回復
              const healAmount = Math.floor(b.maxHp * 0.3); // 30%回復
              b.hp = Math.min(b.maxHp, b.hp + healAmount);
              // 回復のパーティクルエフェクト
              createParticles(b.x, b.y, '#FFD700', 15, 'success');
            }
            return b;
          });
        });
      },
    },
    firefly: {
      name: '光の障壁',
      description: '周囲に光の障壁を展開し、敵の接近を防ぎます（5秒間）',
      cooldown: 25000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 障壁のパーティクルエフェクト
        createParticles(bug.x, bug.y, '#FFA500', 40, 'success');

        // 敵の移動を制限
        setEnemies(prevEnemies => {
          return prevEnemies.map(enemy => {
            const distance = Math.sqrt(
              Math.pow(enemy.x - bug.x, 2) + Math.pow(enemy.y - bug.y, 2)
            );
            if (distance < 150) { // 150px以内の敵の移動を制限
              enemy.speed *= 0.5; // 速度を50%に減少
            }
            return enemy;
          });
        });
      },
    },
  };

  // スコア獲得時のアニメーション
  const playScoreAnimation = (score: number) => {
    setShowScoreAnimation(true);
    scoreAnimationValue.setValue(1);
    Animated.sequence([
      Animated.timing(scoreAnimationValue, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scoreAnimationValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setShowScoreAnimation(false);
    });
  };

  // スコア更新時の処理を修正
  const updateScore = (newScore: number) => {
    setScore(prev => {
      const updatedScore = prev + newScore;
      playScoreAnimation(newScore);
      // 次のレベルまでの進捗を計算
      const nextLevelThreshold = currentLevel * 100;
      const progress = (updatedScore % 100) / 100;
      setProgressToNextLevel(progress);
      return updatedScore;
    });
  };

  // タワーのHPを更新する関数を追加
  const updateTowerHp = (isPlayer: boolean, damage: number) => {
    if (isPlayer) {
      setPlayerTower(prev => ({
        ...prev,
        hp: Math.max(0, prev.hp - damage)
      }));
    } else {
      setEnemyTower(prev => ({
        ...prev,
        hp: Math.max(0, prev.hp - damage)
      }));
    }
    animateTowerHit(isPlayer);
  };

  // タワー攻撃時のアニメーション関数
  const animateTowerHit = (isPlayer: boolean) => {
    if (isPlayer) {
      setPlayerTowerHit(true);
      Animated.sequence([
        Animated.timing(playerTowerShake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(playerTowerShake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(playerTowerShake, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(playerTowerShake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => setTimeout(() => setPlayerTowerHit(false), 150));
    } else {
      setEnemyTowerHit(true);
      Animated.sequence([
        Animated.timing(enemyTowerShake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(enemyTowerShake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(enemyTowerShake, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(enemyTowerShake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => setTimeout(() => setEnemyTowerHit(false), 150));
    }
  };

  return (
    <GameLayout>
      <View style={styles.container}>
        <View style={styles.gameContainer}>
          {/* スコア表示を追加 */}
          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreText}>スコア: {score}</Text>
          </View>

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

          <View style={styles.gameArea}>
            <View style={styles.battleArea}>
              {/* 敵のタワー（左側） */}
              <View style={[styles.tower, { left: 40, top: 80 }]}>
                <Animated.View style={{
                  transform: [{ translateX: playerTowerShake }],
                  backgroundColor: playerTowerHit ? '#ffcccc' : 'transparent',
                  borderRadius: 20,
                }}>
                  <View style={styles.towerEmojiContainer}>
                    <EnemyCastleIcon width={120} height={280} />
                  </View>
                </Animated.View>
                <View style={styles.hpBarContainer}>
                  <View 
                    style={[
                      styles.hpBar, 
                      { 
                        width: `${(playerTower.hp / playerTower.maxHp) * 100}%`,
                        backgroundColor: playerTower.hp > playerTower.maxHp * 0.3 ? '#4CAF50' : '#F44336'
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* 味方のタワー（右側） */}
              <View style={[styles.tower, { right: 40, top: 80 }]}>
                <Animated.View style={{
                  transform: [{ translateX: enemyTowerShake }],
                  backgroundColor: enemyTowerHit ? '#ffcccc' : 'transparent',
                  borderRadius: 20,
                }}>
                  <View style={styles.towerEmojiContainer}>
                    <BugCastleIcon width={120} height={280} />
                  </View>
                </Animated.View>
                <View style={styles.hpBarContainer}>
                  <View 
                    style={[
                      styles.hpBar, 
                      { 
                        width: `${(enemyTower.hp / enemyTower.maxHp) * 100}%`,
                        backgroundColor: enemyTower.hp > enemyTower.maxHp * 0.3 ? '#F44336' : '#4CAF50'
                      }
                    ]} 
                  />
                </View>
              </View>

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
                      width: ENEMY_SIZES[enemy.type],
                      height: ENEMY_SIZES[enemy.type],
                      borderRadius: ENEMY_SIZES[enemy.type] / 2,
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
                        backgroundColor: BUG_COLORS[bug.type],
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
                        backgroundColor: Date.now() - bug.lastAbilityUse < bug.ability.cooldown
                          ? '#ccc'
                          : '#4a90e2',
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
          </View>

          <View style={[styles.questionArea, { 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            height: isSmallScreen ? 100 : 300,
            zIndex: 1000,
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.3,
            shadowRadius: 4.84,
          }]}>
            <View style={styles.framesContainer}>
              {frames.map((frame, frameIndex) => (
                <View
                  key={frame.id}
                  style={[
                    styles.frame,
                    isSmallScreen && styles.frameSmall,
                    {
                      borderColor: BUG_COLORS[frame.id === 1 ? 'ladybug' : frame.id === 2 ? 'wasp' : 'butterfly']
                    }
                  ]}
                >
                  <View style={styles.frameContent}>
                    {frame.question ? (
                      <>
                        <Text style={[styles.bugPreview, isSmallScreen && styles.bugPreviewSmall]}>
                          {BUG_EMOJIS[frame.id === 1 ? 'ladybug' : frame.id === 2 ? 'wasp' : 'butterfly']}
                        </Text>
                        <View style={styles.slotsContainer}>
                          {frame.slots.map((slot, index) => (
                            <View
                              key={`slot-${index}`}
                              style={[
                                styles.letterSlot,
                                slot ? styles.filledSlot : null,
                                isSmallScreen && styles.letterSlotSmall
                              ]}
                            >
                              {slot && (
                                <Text style={[styles.letterSlotText, isSmallScreen && styles.letterSlotTextSmall]}>
                                  {slot}
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>
                        <View style={styles.availableLettersContainer}>
                          {frame.letters.map((letter, index) => (
                            <TouchableOpacity
                              key={`available-${index}`}
                              style={[styles.availableLetter, isSmallScreen && styles.availableLetterSmall]}
                              onPress={() => handleLetterPress(frameIndex, letter)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.availableLetterText, isSmallScreen && styles.availableLetterTextSmall]}>
                                {letter}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : (
                      <Text style={[styles.frameText, isSmallScreen && styles.frameTextSmall]}>枠 {frame.id}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </GameLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  } as ViewStyle,
  gameContainer: {
    flex: 1,
    position: 'relative',
  } as ViewStyle,
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 10,
  } as ViewStyle,
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e8f4f8',
    width: '100%',
    height: screenHeight - 400,
  } as ViewStyle,
  battleArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    zIndex: 1,
    overflow: 'visible',
  } as ViewStyle,
  questionArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.84,
    zIndex: 1000,
  } as ViewStyle,
  framesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 5,
    height: '100%',
    gap: 10, // フレーム間の間隔を追加
  } as ViewStyle,
  frame: {
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 12,
    borderWidth: 3,
    borderColor: '#4a90e2',
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 4,
  } as ViewStyle,
  frameContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  } as ViewStyle,
  bugPreview: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 36,
    opacity: 0.8,
  } as TextStyle,
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: 5,
    marginTop: 5,
    gap: 4, // スロット間の間隔を追加
  } as ViewStyle,
  letterSlot: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#4a90e2',
    borderRadius: 12,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.05)',
  } as ViewStyle,
  filledSlot: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  } as ViewStyle,
  letterSlotText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  } as TextStyle,
  availableLettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 5,
    marginTop: 8,
    width: '100%',
    minHeight: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    gap: 4, // 文字間の間隔を追加
  } as ViewStyle,
  availableLetter: {
    width: 70,
    height: 70,
    backgroundColor: '#4a90e2',
    borderRadius: 12,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.84,
    elevation: 2,
  } as ViewStyle,
  availableLetterText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  } as TextStyle,
  frameSmall: {
    padding: 8,
    borderWidth: 2.5,
  } as ViewStyle,
  bugPreviewSmall: {
    fontSize: 24,
  } as TextStyle,
  letterSlotSmall: {
    width: 50,
    height: 50,
    margin: 2,
  } as ViewStyle,
  letterSlotTextSmall: {
    fontSize: 32,
  } as TextStyle,
  availableLetterSmall: {
    width: 50,
    height: 50,
    margin: 2,
  } as ViewStyle,
  availableLetterTextSmall: {
    fontSize: 28,
  } as TextStyle,
  frameTextSmall: {
    fontSize: 12,
  } as TextStyle,
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
  } as ViewStyle,
  levelUpText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,
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
  } as ViewStyle,
  comboText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,
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
    zIndex: 3,
    backgroundColor: '#ff00ff',
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
  abilityButton: {
    position: 'absolute',
    padding: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 100,
    alignItems: 'center',
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
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    margin: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  } as ViewStyle,
  levelContainer: {
    flex: 1,
  },
  progressBarContainer: {
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 5,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4a90e2',
    borderRadius: 3,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreAnimation: {
    position: 'absolute',
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  startScreen: {} as ViewStyle,
  gameTitle: {} as TextStyle,
  gameDescription: {} as TextStyle,
  startButtonContainer: {} as ViewStyle,
  startButton: {} as ViewStyle,
  startButtonText: {} as TextStyle,
  scoreDisplay: {
    position: 'absolute',
    top: 10,
    right: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 20,
    zIndex: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  } as ViewStyle,
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  } as TextStyle,
  frameText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  } as TextStyle,
  tower: {
    position: 'absolute',
    width: 100,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  } as ViewStyle,
  towerEmojiContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  towerEmoji: {
    fontSize: 120,
  } as TextStyle,
  hpBarContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  } as ViewStyle,
  hpBar: {
    height: '100%',
    borderRadius: 5,
  } as ViewStyle,
}); 