import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, ImageStyle, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import BugCastleIcon from '../../assets/images/bugbattle/BugCastleIcon';
import EnemyCastleIcon from '../../assets/images/bugbattle/EnemyCastleIcon';
import LevelIcon from '../../assets/images/bugbattle/LevelIcon';
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
// iPadの画面サイズを考慮して、画面の向きに関係なく判定
const isSmallScreen = Math.min(screenWidth, screenHeight) < 768; // 768ptを基準に

// 虫の画像マッピング
const BUG_IMAGES = {
  kabuto: require('../../assets/images/bugbattle/bug1.png'),      // カブトムシ
  kuwagata: require('../../assets/images/bugbattle/bug2.png'),    // クワガタ
  gohon: require('../../assets/images/bugbattle/bug3.png'),       // ゴホンヅノカブト
  caucasus: require('../../assets/images/bugbattle/bug4.png'),    // コーカサスオオカブト
} as const;

// 敵の画像マッピング
const ENEMY_IMAGES = {
  beetle: require('../../assets/images/bugbattle/enemy1.png'),
  stag: require('../../assets/images/bugbattle/enemy2.png'),
  mantis: require('../../assets/images/bugbattle/enemy3.png'),
} as const;

// 虫のサイズ定数
const BUG_SIZES = {
  kabuto: isSmallScreen ? 50 : 80,     // カブトムシのサイズ
  kuwagata: isSmallScreen ? 50 : 80,   // クワガタのサイズ
  gohon: isSmallScreen ? 50 : 80,      // ゴホンヅノカブトのサイズ
  caucasus: isSmallScreen ? 50 : 80,   // コーカサスオオカブトのサイズ
} as const;

// 敵のサイズ定数
const ENEMY_SIZES = {
  beetle: isSmallScreen ? 50 : 80,    // カブトムシのサイズ
  stag: isSmallScreen ? 50 : 80,      // クワガタのサイズ
  mantis: isSmallScreen ? 50 : 80,    // カマキリのサイズ
} as const;

// 虫の種類
type BugType = keyof typeof BUG_IMAGES;
// 敵の種類
type EnemyType = keyof typeof ENEMY_IMAGES;

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
  attack: number; // 攻撃力を追加
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
  defense: number; // 防御力を追加
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
  cooldown: number;
  lastUsed: number;
  currentIndex: number;
}

// 難易度設定
interface Difficulty {
  level: number;
  bugSpeed: number;
  enemySpeed: number;
  enemySpawnRate: number;
  scoreMultiplier: number;
}

// パーティクル
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

// タワー
interface Tower {
  hp: number;
  maxHp: number;
}

const DIFFICULTY_LEVELS: Difficulty[] = [
  { level: 1, bugSpeed: 0.67, enemySpeed: 1.2, enemySpawnRate: 0.9, scoreMultiplier: 1 },    // 90%の確率で出現
  { level: 2, bugSpeed: 0.83, enemySpeed: 1.5, enemySpawnRate: 0.95, scoreMultiplier: 1.2 }, // 95%の確率で出現
  { level: 3, bugSpeed: 1, enemySpeed: 1.8, enemySpawnRate: 0.98, scoreMultiplier: 1.5 },    // 98%の確率で出現
  { level: 4, bugSpeed: 1.17, enemySpeed: 2.1, enemySpawnRate: 0.99, scoreMultiplier: 2 },   // 99%の確率で出現
  { level: 5, bugSpeed: 1.33, enemySpeed: 2.4, enemySpawnRate: 1, scoreMultiplier: 2.5 },    // 100%の確率で出現
];

// 敵の出現間隔（ミリ秒）
const ENEMY_SPAWN_INTERVAL = 2000; // 2秒ごとに敵の出現を試みる

// 1枠分の新しい問題を生成
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
  1: 'kabuto',     // 1番目の枠はカブトムシ
  2: 'kuwagata',   // 2番目の枠はクワガタ
  3: 'gohon',      // 3番目の枠はゴホンヅノカブト
  4: 'caucasus',   // 4番目の枠はコーカサスオオカブト
};

// 虫の色
const BUG_COLORS = {
  kabuto: '#8B4513',     // 茶色系
  kuwagata: '#4169E1',   // ロイヤルブルー
  gohon: '#CD853F',      // ペルー
  caucasus: '#006400',   // ダークレッド
} as const;

// wordLists
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
  const [gameOver, setGameOver] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const enemySpawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    { id: 1, question: null, letters: [], slots: [], cooldown: 0, lastUsed: 0, currentIndex: 0 },
    { id: 2, question: null, letters: [], slots: [], cooldown: 0, lastUsed: 0, currentIndex: 0 },
    { id: 3, question: null, letters: [], slots: [], cooldown: 7000, lastUsed: 0, currentIndex: 0 },
    { id: 4, question: null, letters: [], slots: [], cooldown: 9000, lastUsed: 0, currentIndex: 0 },
  ]);
  const [progressToNextLevel, setProgressToNextLevel] = useState(0);
  const [showScoreAnimation, setShowScoreAnimation] = useState(false);
  const [scoreAnimationValue] = useState(new Animated.Value(1));
  const [cooldownProgress, setCooldownProgress] = useState<{[key: number]: number}>({
    3: 100,
    4: 100
  });
  const [correctAnswerAnimations, setCorrectAnswerAnimations] = useState<{[key: number]: Animated.Value[]}>({});
  // 状態の型定義を更新
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);

  // 連番ID生成用ref
  const bugIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const particleIdRef = useRef<number>(0);

  // 音声の読み込み
  const soundsRef = useRef<{
    bugSpawn: Audio.Sound | null;
    enemySpawn: Audio.Sound | null;
    collision: Audio.Sound | null;
    playerTowerHit: Audio.Sound | null;
    enemyTowerHit: Audio.Sound | null;
    abilityLadybug: Audio.Sound | null;
    abilityWasp: Audio.Sound | null;
    abilityButterfly: Audio.Sound | null;
    abilityFirefly: Audio.Sound | null;
    levelUp: Audio.Sound | null;
  }>({
    bugSpawn: null,
    enemySpawn: null,
    collision: null,
    playerTowerHit: null,
    enemyTowerHit: null,
    abilityLadybug: null,
    abilityWasp: null,
    abilityButterfly: null,
    abilityFirefly: null,
    levelUp: null,
  });
  
  const [playerTower, setPlayerTower] = useState<Tower>({
    hp: 100,
    maxHp: 100,
  });
  const [enemyTower, setEnemyTower] = useState<Tower>({
    hp: 100,
    maxHp: 100,
  });

  // タワーのアニメーション用state
  const [playerTowerShake] = useState(new Animated.Value(0));
  const [enemyTowerShake] = useState(new Animated.Value(0));
  const [playerTowerHit, setPlayerTowerHit] = useState(false);
  const [enemyTowerHit, setEnemyTowerHit] = useState(false);

  // ゲームオーバー状態
  const [isGameOverScreen, setIsGameOverScreen] = useState(false);
  // ゲームクリア状態
  const [isGameClearScreen, setIsGameClearScreen] = useState(false);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const textBounceAnim = useRef(new Animated.Value(0)).current;

  // 結果画面のアニメーション
  useEffect(() => {
    if (isGameOverScreen || isGameClearScreen) {
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
  }, [isGameOverScreen, isGameClearScreen]);

  const createParticles = (x: number, y: number, color: string, count: number = 10, type: 'success' | 'failure' = 'success') => {
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      id: particleIdRef.current++,
      x,
      y,
      color,
      size: type === 'failure' ? Math.random() * 8 + 4 : Math.random() * 4 + 2, // 失敗時はパーティクルを大きく
      velocity: {
        x: (Math.random() - 0.5) * (type === 'failure' ? 12 : 8), // 失敗時は速度を上げる
        y: (Math.random() - 0.5) * (type === 'failure' ? 12 : 8),
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
            toValue: type === 'failure' ? 1.5 : 1, // 失敗時はスケールを大きく
            duration: type === 'failure' ? 300 : 200,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: type === 'failure' ? 400 : 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: type === 'failure' ? 700 : 500, // 失敗時は長く表示
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: type === 'failure' ? 720 : 360, // 失敗時は回転を増やす
          duration: type === 'failure' ? 700 : 500,
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
        const playerTowerHitSound = new Audio.Sound();
        const enemyTowerHitSound = new Audio.Sound();
        const abilityLadybugSound = new Audio.Sound();
        const abilityWaspSound = new Audio.Sound();
        const abilityButterflySound = new Audio.Sound();
        const abilityFireflySound = new Audio.Sound();
        const levelUpSound = new Audio.Sound();

        // 音声の読み込みを順番に実行
        await Promise.all([
          bugSpawnSound.loadAsync(require('../../assets/sounds/bugbattle/bug_spawn.mp3'), { shouldPlay: false }),
          enemySpawnSound.loadAsync(require('../../assets/sounds/bugbattle/enemy_spawn.mp3'), { shouldPlay: false }),
          collisionSound.loadAsync(require('../../assets/sounds/bugbattle/collision.mp3'), { shouldPlay: false }),
          playerTowerHitSound.loadAsync(require('../../assets/sounds/bugbattle/player_tower_hit.mp3'), { shouldPlay: false }),
          enemyTowerHitSound.loadAsync(require('../../assets/sounds/bugbattle/enemy_tower_hit.mp3'), { shouldPlay: false }),
          abilityLadybugSound.loadAsync(require('../../assets/sounds/bugbattle/ability_ladybug_defense.mp3'), { shouldPlay: false }),
          abilityWaspSound.loadAsync(require('../../assets/sounds/bugbattle/ability_wasp_poison.mp3'), { shouldPlay: false }),
          abilityButterflySound.loadAsync(require('../../assets/sounds/bugbattle/ability_butterfly_heal..mp3'), { shouldPlay: false }),
          abilityFireflySound.loadAsync(require('../../assets/sounds/bugbattle/ability_firefly_barrier.mp3'), { shouldPlay: false }),
          levelUpSound.loadAsync(require('../../assets/sounds/bugbattle/level_up.mp3'), { shouldPlay: false })
        ]);

        soundsRef.current = {
          bugSpawn: bugSpawnSound,
          enemySpawn: enemySpawnSound,
          collision: collisionSound,
          playerTowerHit: playerTowerHitSound,
          enemyTowerHit: enemyTowerHitSound,
          abilityLadybug: abilityLadybugSound,
          abilityWasp: abilityWaspSound,
          abilityButterfly: abilityButterflySound,
          abilityFirefly: abilityFireflySound,
          levelUp: levelUpSound,
        };
      } catch (error) {
        console.error('音声の読み込みに失敗しました:', error);
      }
    };

    loadSounds();

    // クリーンアップ
    return () => {
      const cleanup = async () => {
        try {
          const sounds = Object.values(soundsRef.current);
          await Promise.all(sounds.map(async (sound) => {
            if (sound) {
              try {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                  await sound.stopAsync();
                  await sound.unloadAsync();
                }
              } catch (error) {
                // エラーを無視して続行
                console.warn('音声のクリーンアップ中にエラーが発生しました:', error);
              }
            }
          }));
        } catch (error) {
          console.warn('音声のクリーンアップ中にエラーが発生しました:', error);
        }
      };
      cleanup();
    };
  }, []);

  // 音声再生
  const playSound = async (sound: Audio.Sound | null) => {
    try {
      if (!sound) {
        console.warn('音声が読み込まれていません');
        return;
      }

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        console.warn('音声が読み込まれていません');
        return;
      }

      // 再生中の場合は停止してから再生
      if (status.isPlaying) {
        try {
          await sound.stopAsync();
          await sound.setPositionAsync(0);
        } catch (error) {
          console.warn('音声の停止に失敗しました:', error);
        }
      }

      // 再生を開始
      try {
        const playbackStatus = await sound.playAsync();
        if (!playbackStatus.isLoaded) {
          throw new Error('音声の再生に失敗しました');
        }
      } catch (error) {
        console.warn('音声の再生に失敗しました:', error);
        // 音声の再読み込みを試みる
        try {
          await sound.unloadAsync();
          const soundFile = require('../../assets/sounds/bugbattle/bug_spawn.mp3');
          await sound.loadAsync(soundFile, { shouldPlay: true });
        } catch (reloadError) {
          console.error('音声の再読み込みに失敗しました:', reloadError);
        }
      }
    } catch (error) {
      console.error('音声処理中にエラーが発生しました:', error);
    }
  };

  // 初期化
  useEffect(() => {
    // ゲームの初期化
    initializeGame();
    startGameLoop();

    // クリーンアップ関数
    return () => {
      // 全てのインターバルをクリア
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (enemySpawnIntervalRef.current) {
        clearInterval(enemySpawnIntervalRef.current);
        enemySpawnIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // 全ての状態をリセット
      setEnemies([]);
      setBugs([]);
      setGameOver(false);
      setIsGameOverScreen(false);
      setIsGameClearScreen(false);
      setCurrentLevel(1);
      setConsecutiveCorrect(0);
      setGameTime(0);
      setQuestionsAnswered(0);
      setPlayerTower({ hp: 100, maxHp: 100 });
      setEnemyTower({ hp: 100, maxHp: 100 });
      isRetryingRef.current = false;
      isSwitchingKanaRef.current = false;
    };
  }, []);

  const handleRetry = () => {
    isRetryingRef.current = true;
    // ゲームオーバーとゲームクリアの状態をリセット
    setIsGameOverScreen(false);
    setIsGameClearScreen(false);
  };

  // ゲームの初期化
  const initializeGame = () => {
    // 両方のクイズを初期化
    generateQuestion(0);
    generateQuestion(1);
    
    // 初期の味方を生成
    setTimeout(() => {
      spawnBug(FRAME_BUG_TYPES[1]);
    }, 100);
  };

  // ゲームループの開始
  const startGameLoop = () => {
    // 既存のゲームループをクリア
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    // 敵の生成インターバルを設定
    if (enemySpawnIntervalRef.current) {
      clearInterval(enemySpawnIntervalRef.current);
      enemySpawnIntervalRef.current = null;
    }

    // 新しい敵生成インターバルを設定
    enemySpawnIntervalRef.current = setInterval(() => {
      if (!gameOver && !isGameOverScreen && !isGameClearScreen) {
        spawnEnemy();
      }
    }, ENEMY_SPAWN_INTERVAL) as unknown as NodeJS.Timeout;

    // 新しいゲームループを開始
    const gameLoop = () => {
      if (!gameOver && !isGameOverScreen && !isGameClearScreen) {
        updateGameState();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      }
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  // 難易度の取得
  const getCurrentDifficulty = (): Difficulty => {
    // レベル5以降はレベル5の難易度を維持
    const levelIndex = Math.min(currentLevel - 1, 4);
    return DIFFICULTY_LEVELS[levelIndex];
  };

  // レベルアップ演出
  const playLevelUpAnimation = () => {
    setShowLevelUpText(true);
    Animated.sequence([
      Animated.timing(levelUpAnimation, {
        toValue: isSmallScreen ? 1.3 : 1.5,
        duration: isSmallScreen ? 400 : 500,
        useNativeDriver: true,
      }),
      Animated.timing(levelUpAnimation, {
        toValue: 1,
        duration: isSmallScreen ? 400 : 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setShowLevelUpText(false);
      }, isSmallScreen ? 200 : 300);
    });
  };

  // コンボ演出
  const playComboAnimation = () => {
    setShowComboText(true);
    Animated.sequence([
      Animated.timing(comboAnimation, {
        toValue: isSmallScreen ? 1.2 : 1.3,
        duration: isSmallScreen ? 250 : 300,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(comboAnimation, {
        toValue: 1,
        duration: isSmallScreen ? 250 : 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setShowComboText(false);
      }, isSmallScreen ? 400 : 500);
    });
  };

  // ゲーム状態の更新
  const updateGameState = async () => {
    const now = Date.now();

    try {
      // 状態の更新を同期的に行う
      await Promise.all([
        updateBugs(),
        updateEnemies()
      ]);
      
      // 特殊効果の更新
      setBugs(prevBugs => {
        return prevBugs.map(bug => {
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
          if (enemy.isPoisoned && enemy.poisonTimer && now > enemy.poisonTimer) {
            enemy.isPoisoned = false;
            enemy.poisonTimer = null;
            enemy.poisonDamage = 0;
          } else if (enemy.isPoisoned) {
            enemy.hp -= enemy.poisonDamage;
            if (enemy.hp <= 0) {
              animateEnemyDisappearance(enemy);
              return null;
            }
          }
          return enemy;
        }).filter((enemy): enemy is Enemy => enemy !== null);
      });
      
      // 最新の状態を取得して衝突判定を実行
      checkCollisions();
    } catch (error) {
      console.error('Error in updateGameState:', error);
    }
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
        }).filter(enemy => enemy.x < screenWidth + 400);
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
    const bugRadius = BUG_SIZES[bug.type] * 0.5; // 半径を計算
    const enemyRadius = ENEMY_SIZES[enemy.type] * 0.5; // 半径を計算
    const collisionThreshold = (bugRadius + enemyRadius) * 1.2; // 衝突判定の距離を20%増加
    
    return distance < collisionThreshold;
  };

  // 衝突判定と処理
  const checkCollisions = () => {
    const currentBugs = bugsRef.current;
    const currentEnemies = enemiesRef.current;
    
    currentBugs.forEach(bug => {
      // 味方のタワーとの衝突判定
      const towerRightEdge = isSmallScreen ? 20 + 80 : 40 + 100;
      const collisionOffset = isSmallScreen ? 20 : 40;
      if (bug.x <= towerRightEdge - collisionOffset) {
        updateTowerHp(true, 3); // タワーへのダメージを8から3に減少
        animateBugDisappearance(bug);
        return;
      }

      currentEnemies.forEach(enemy => {
        if (checkCollision(bug, enemy)) {
          // 味方の攻撃
          const bugDamage = Math.max(1, bug.attack - enemy.defense);
          enemy.hp -= bugDamage;
          
          // 敵の攻撃
          const enemyDamage = Math.max(1, enemy.attack - bug.defense);
          bug.hp -= enemyDamage;

          playAttackAnimation(enemy.id);
          createParticles(
            (bug.x + enemy.x) / 2,
            (bug.y + enemy.y) / 2,
            bug.hp <= 0 ? '#F44336' : '#4CAF50',
            30,
            bug.hp <= 0 ? 'failure' : 'success'
          );
          playSound(soundsRef.current.collision);

          // 敵を倒した場合のみスコアを加算
          if (enemy.hp <= 0) {
            const difficulty = getCurrentDifficulty();
            const scoreGain = Math.floor(15 * difficulty.scoreMultiplier);
            // スコア加算処理を削除
          }

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
      const towerLeftEdge = screenWidth - (isSmallScreen ? 20 + 80 : 40 + 100);
      const collisionOffset = isSmallScreen ? 80 : 120;
      if (enemy.x >= towerLeftEdge - collisionOffset) {
        updateTowerHp(false, 3); // タワーへのダメージを8から3に減少
        animateEnemyDisappearance(enemy);
        return;
      }
    });
  };

  // 虫の消滅アニメーション
  const animateBugDisappearance = (bug: Bug) => {
    // パーティクルエフェクトを追加（数を増やし、色を鮮やかに）
    createParticles(bug.x, bug.y, '#FF4081', 50, 'failure');
    // 追加のパーティクルエフェクト（異なる色で）
    createParticles(bug.x, bug.y, '#2196F3', 30, 'failure');
    // 味方が倒れた時の音を再生
    playSound(soundsRef.current.collision);
    // 画面を揺らす
    shakeScreen();

    Animated.parallel([
      Animated.timing(bug.scale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bug.opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // アニメーション完了後に状態を更新
      requestAnimationFrame(() => {
        setBugs(prev => prev.filter(b => b.id !== bug.id));
      });
    });
  };

  // 敵の消滅アニメーション
  const animateEnemyDisappearance = (enemy: Enemy) => {
    Animated.parallel([
      Animated.timing(enemy.scale, {
        toValue: 0,
        duration: 150, // 300から150に短縮
        useNativeDriver: true,
      }),
    ]).start(() => {
      // アニメーション完了後に状態を更新
      requestAnimationFrame(() => {
        setEnemies(prev => prev.filter(e => e.id !== enemy.id));
      });
    });
  };

  // 攻撃アニメーション
  const playAttackAnimation = (id: number) => {
    setIsAttacking(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setIsAttacking(prev => ({ ...prev, [id]: false }));
    }, 200); // 500から200に短縮
  };

  // リトライ状態を管理するためのref
  const isRetryingRef = useRef(false);

  // リトライ状態の変更を監視するuseEffect
  useEffect(() => {
    if (isRetryingRef.current) {
      // 既存のインターバルをクリア
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (enemySpawnIntervalRef.current) {
        clearInterval(enemySpawnIntervalRef.current);
        enemySpawnIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // 敵と味方をクリア
      setEnemies([]);
      setBugs([]);

      // すべてのゲーム状態を一度にリセット
      setGameOver(false);
      setIsGameOverScreen(false);
      setIsGameClearScreen(false);
      setCurrentLevel(1);
      setConsecutiveCorrect(0);
      setGameTime(0);
      setQuestionsAnswered(0);
      setPlayerTower({ hp: 100, maxHp: 100 });
      setEnemyTower({ hp: 100, maxHp: 100 });

      // 少し遅延を入れてから初期化を実行
      setTimeout(() => {
        initializeGame();
        startGameLoop();
        isRetryingRef.current = false;
      }, 100);
    }
  }, [isGameOverScreen, isGameClearScreen]);

  // カナ切り替え状態を管理するためのref
  const isSwitchingKanaRef = useRef(false);

  // カナ切り替え状態の変更を監視するuseEffect
  useEffect(() => {
    if (isSwitchingKanaRef.current) {
      // 既存のインターバルをクリア
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (enemySpawnIntervalRef.current) {
        clearInterval(enemySpawnIntervalRef.current);
        enemySpawnIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // 敵と味方をクリア
      setEnemies([]);
      setBugs([]);

      // ゲーム状態をリセット
      setIsGameOverScreen(false);
      setIsGameClearScreen(false);
      setGameOver(false);
      setCurrentLevel(1);
      setConsecutiveCorrect(0);
      setGameTime(0);
      setQuestionsAnswered(0);
      setPlayerTower({ hp: 100, maxHp: 100 });
      setEnemyTower({ hp: 100, maxHp: 100 });

      // 少し遅延を入れてから初期化を実行
      setTimeout(() => {
        initializeGame();
        startGameLoop();
        isSwitchingKanaRef.current = false;
      }, 100);
    }
  }, [isHiragana]);

  const handleSwitchKana = () => {
    isSwitchingKanaRef.current = true;
    // カナの種類を切り替え
    setIsHiragana(prev => !prev);
  };

  // ゲームメニューの表示状態が変更されたときの処理
  useEffect(() => {
    if (!isSettingsVisible) {
      // メニューが閉じられたときにゲーム状態を確認
      if (isGameOverScreen || isGameClearScreen) {
        // インターバルをクリア
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
          gameLoopRef.current = null;
        }
        if (enemySpawnIntervalRef.current) {
          clearInterval(enemySpawnIntervalRef.current);
          enemySpawnIntervalRef.current = null;
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // 敵と味方をクリア
        setEnemies([]);
        setBugs([]);
      }
    }
  }, [isSettingsVisible]);

  // 味方の生成間隔（ミリ秒）
  const BUG_SPAWN_COOLDOWN = 1000; // 1秒間隔
  const lastBugSpawnTimeRef = useRef<number>(0);

  // 味方の生成
  const spawnBug = (bugType: BugType) => {
    if (isGameOverScreen || isGameClearScreen) return;
    
    const now = Date.now();
    // 生成間隔をチェック
    if (now - lastBugSpawnTimeRef.current < BUG_SPAWN_COOLDOWN) {
      return; // クールダウン中は生成しない
    }
    
    // 現在の味方の数をチェック
    const currentBugCount = bugsRef.current.length;
    const maxBugs = 5; // 最大数を設定
    
    if (currentBugCount >= maxBugs) {
      return; // 最大数に達している場合は生成しない
    }

    lastBugSpawnTimeRef.current = now; // 生成時間を更新

    const difficulty = getCurrentDifficulty();
    bugIdRef.current += 1;
    const newBug: Bug = {
      id: bugIdRef.current,
      type: bugType,
      x: screenWidth - 200 ,
      y: isSmallScreen ? 150 : 280,
      targetX: 0,
      targetY: 0,
      speed: difficulty.bugSpeed * 2.5,
      rotation: new Animated.Value(0),
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      ability: BUG_ABILITIES[bugType],
      lastAbilityUse: 0,
      hp: 100,
      maxHp: 100,
      defense: 12,
      baseDefense: 12,
      isDefenseBoosted: false,
      defenseBoostTimer: null,
      attack: 15,
    };
    setBugs(prevBugs => {
      const newBugs = [...prevBugs, newBug];
      bugsRef.current = newBugs;
      return newBugs;
    });
    playSound(soundsRef.current.bugSpawn);
  };

  // 答えの確認
  const checkAnswer = (frameIndex: number, slots: string[]) => {
    if (isGameOverScreen || isGameClearScreen) return;
    if (!frames[frameIndex]?.question) return;

    const answer = slots.join('');
    if (answer === frames[frameIndex].question) {
      // 正解の場合
      setQuestionsAnswered(prev => {
        const newCount = prev + 1;
        
        // 両方のフレームで合計10問正解でレベルアップ
        if (newCount >= 10) {
          // レベル5以降はレベルアップしない
          if (currentLevel < 5) {
            setCurrentLevel(prev => prev + 1);
            playLevelUpAnimation();
          }
          setQuestionsAnswered(0);
        }
        return newCount;
      });

      // 正解時のアニメーション
      const animations = slots.map(() => new Animated.Value(0));
      setCorrectAnswerAnimations(prev => ({
        ...prev,
        [frameIndex]: animations
      }));

      // 各文字のアニメーションを順番に実行
      animations.forEach((anim, index) => {
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start();
        }, index * 100);
      });

      // 正解時に味方を生成
      if (!isGameOverScreen && !isGameClearScreen) {
        const bugType = FRAME_BUG_TYPES[frameIndex + 1];
        if (bugType) {
          spawnBug(bugType);
        }
      }

      // 正解したクイズのみ新しい問題を生成
      setTimeout(() => {
        generateQuestion(frameIndex);
      }, 6000);
    } else {
      // 不正解の場合
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
    if (isGameOverScreen || isGameClearScreen) return;
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
    if (isGameOverScreen || isGameClearScreen) return;
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
    kabuto: {
      name: '角の突進',
      description: '強力な角で敵を突き飛ばし、一時的に動きを鈍らせます',
      cooldown: 8000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 最も近い敵を探す
        if (!enemies || enemies.length === 0) return;
        
        const nearestEnemy = enemies.reduce((nearest, current) => {
          if (!nearest) return current;
          
          const nearestDist = Math.sqrt(
            Math.pow(nearest.x - bug.x, 2) + Math.pow(nearest.y - bug.y, 2)
          );
          const currentDist = Math.sqrt(
            Math.pow(current.x - bug.x, 2) + Math.pow(current.y - bug.y, 2)
          );
          return currentDist < nearestDist ? current : nearest;
        }, null as Enemy | null);
        
        if (!nearestEnemy) return;
        if (nearestEnemy) {
          // 敵の移動速度を30%に減少（50%から強化）
          nearestEnemy.speed *= 0.3;
          // 突進のパーティクルエフェクトを増加
          createParticles(nearestEnemy.x, nearestEnemy.y, '#8B4513', 30, 'success');
          // 突進音
          playSound(soundsRef.current.abilityLadybug);
          // 視覚的なフィードバック
          Animated.sequence([
            Animated.timing(bug.scale, {
              toValue: 1.5,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(bug.scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    },
    kuwagata: {
      name: '大アゴの挟撃',
      description: '強力な大アゴで敵を挟み、防御力を一時的に下げます',
      cooldown: 12000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 最も近い敵を探す
        if (!enemies || enemies.length === 0) return;
        
        const nearestEnemy = enemies.reduce((nearest, current) => {
          if (!nearest) return current;
          
          const nearestDist = Math.sqrt(
            Math.pow(nearest.x - bug.x, 2) + Math.pow(nearest.y - bug.y, 2)
          );
          const currentDist = Math.sqrt(
            Math.pow(current.x - bug.x, 2) + Math.pow(current.y - bug.y, 2)
          );
          return currentDist < nearestDist ? current : nearest;
        }, null as Enemy | null);
        
        if (!nearestEnemy) return;
        if (nearestEnemy) {
          // 敵の防御力を30%に減少（50%から強化）
          nearestEnemy.defense *= 0.3;
          // 挟撃のパーティクルエフェクトを増加
          createParticles(nearestEnemy.x, nearestEnemy.y, '#2F4F4F', 30, 'success');
          // 挟撃音
          playSound(soundsRef.current.abilityWasp);
          // 視覚的なフィードバック
          Animated.sequence([
            Animated.timing(bug.scale, {
              toValue: 1.5,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(bug.scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    },
    gohon: {
      name: '五本角の突撃',
      description: '五本の角で敵を貫き、攻撃力を一時的に下げます',
      cooldown: 15000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 最も近い敵を探す
        if (!enemies || enemies.length === 0) return;
        
        const nearestEnemy = enemies.reduce((nearest, current) => {
          if (!nearest) return current;
          
          const nearestDist = Math.sqrt(
            Math.pow(nearest.x - bug.x, 2) + Math.pow(nearest.y - bug.y, 2)
          );
          const currentDist = Math.sqrt(
            Math.pow(current.x - bug.x, 2) + Math.pow(current.y - bug.y, 2)
          );
          return currentDist < nearestDist ? current : nearest;
        }, null as Enemy | null);
        
        if (!nearestEnemy) return;
        if (nearestEnemy) {
          // 敵の攻撃力を30%に減少（50%から強化）
          nearestEnemy.attack *= 0.3;
          // 突撃のパーティクルエフェクトを増加
          createParticles(nearestEnemy.x, nearestEnemy.y, '#CD853F', 30, 'success');
          // 突撃音
          playSound(soundsRef.current.abilityButterfly);
          // 視覚的なフィードバック
          Animated.sequence([
            Animated.timing(bug.scale, {
              toValue: 1.5,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(bug.scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    },
    caucasus: {
      name: '王者の威圧',
      description: '世界最大のカブトムシとしての威圧で、周囲の敵の能力を一時的に下げます',
      cooldown: 20000, // 25秒から20秒に短縮
      effect: (bug: Bug, enemies: Enemy[]) => {
        // 周囲の敵の能力を下げる
        setEnemies(prevEnemies => {
          return prevEnemies.map(enemy => {
            const distance = Math.sqrt(
              Math.pow(enemy.x - bug.x, 2) + Math.pow(enemy.y - bug.y, 2)
            );
            if (distance < 250) { // 範囲を200pxから250pxに拡大
              enemy.attack *= 0.5;  // 攻撃力を50%減少（30%から強化）
              enemy.defense *= 0.5; // 防御力を50%減少（30%から強化）
              enemy.speed *= 0.5;   // 移動速度を50%減少（30%から強化）
              // 各敵にパーティクルエフェクトを追加
              createParticles(enemy.x, enemy.y, '#006400', 20, 'success');
            }
            return enemy;
          });
        });
        // 威圧のパーティクルエフェクトを増加
        createParticles(bug.x, bug.y, '#006400', 50, 'success');
        // 威圧音
        playSound(soundsRef.current.abilityFirefly);
        // 視覚的なフィードバック
        Animated.sequence([
          Animated.timing(bug.scale, {
            toValue: 1.8,
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
  };

  // タワーのHPを更新する関数
  const updateTowerHp = (isPlayer: boolean, damage: number) => {
    console.log('updateTowerHp: Starting update', { isPlayer, damage });
    if (isPlayer) {
      setPlayerTower(prev => {
        const newHp = Math.max(0, prev.hp - damage);
        console.log('updateTowerHp: Player tower HP update', { prevHp: prev.hp, newHp });
        if (newHp <= 0) {
          console.log('updateTowerHp: Setting game clear screen');
          // ゲームクリア時の処理
          setIsGameClearScreen(true);
          setIsGameOverScreen(false);
          // インターバルをクリア
          if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current);
            gameLoopRef.current = null;
          }
          if (enemySpawnIntervalRef.current) {
            clearInterval(enemySpawnIntervalRef.current);
            enemySpawnIntervalRef.current = null;
          }
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          // 味方と敵を消去
          setBugs([]);
          setEnemies([]);
        }
        // 味方タワー攻撃音
        playSound(soundsRef.current.playerTowerHit);
        return { ...prev, hp: newHp };
      });
    } else {
      setEnemyTower(prev => {
        const newHp = Math.max(0, prev.hp - damage);
        console.log('updateTowerHp: Enemy tower HP update', { prevHp: prev.hp, newHp });
        if (newHp <= 0) {
          console.log('updateTowerHp: Setting game over screen');
          // ゲームオーバー時の処理
          setIsGameOverScreen(true);
          setIsGameClearScreen(false);
          // インターバルをクリア
          if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current);
            gameLoopRef.current = null;
          }
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          // 味方と敵を消去
          setBugs([]);
          setEnemies([]);
        }
        // 敵タワー攻撃音
        playSound(soundsRef.current.enemyTowerHit);
        return { ...prev, hp: newHp };
      });
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

  // ゲーム進行ガード
  const isGameEnded = isGameOverScreen || isGameClearScreen;

  // useEffectでアンマウント時にインターバルをクリア
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (enemySpawnIntervalRef.current) clearInterval(enemySpawnIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // クールダウンの進捗を更新するuseEffect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCooldownProgress({
        3: Math.min(100, ((now - frames[2].lastUsed) / frames[2].cooldown) * 100),
        4: Math.min(100, ((now - frames[3].lastUsed) / frames[3].cooldown) * 100)
      });
    }, 50); // 50ミリ秒ごとに更新

    return () => clearInterval(interval);
  }, [frames]);

  // クールダウンフレームのクリック処理
  const handleCooldownFrameClick = (frameIndex: number) => {
    if (isGameOverScreen || isGameClearScreen) return;
    const now = Date.now();
    const frame = frames[frameIndex];
    
    if (now - frame.lastUsed >= frame.cooldown) {
      // クールダウンが終了している場合
      setFrames(prevFrames => prevFrames.map((f, idx) => 
        idx === frameIndex ? { ...f, lastUsed: now } : f
      ));
      
      // 味方を生成（ゲーム終了時は生成しない）
      if (!isGameOverScreen && !isGameClearScreen) {
        const bugType = FRAME_BUG_TYPES[frame.id];
        if (bugType) {
          spawnBug(bugType);
        }
      }
    }
  };

  // 問題の生成
  const generateQuestion = (frameIndex: number) => {
    const wordLists = getWordLists(isHiragana);
    const wordList = wordLists[currentLevel as keyof typeof wordLists];
    
    // 両方のフレームで使用済みの単語を追跡
    const usedWords = new Set<string>();
    
    // ランダムに単語を選択
    let word;
    do {
      const randomIndex = Math.floor(Math.random() * wordList.length);
      word = wordList[randomIndex];
    } while (usedWords.has(word));
    
    usedWords.add(word);
    
    // 文字をシャッフル
    const letters = word.split('').sort(() => Math.random() - 0.5);
    
    // フレームの状態を更新
    setFrames(prevFrames => {
      const newFrames = [...prevFrames];
      newFrames[frameIndex] = {
        ...newFrames[frameIndex],
        question: word,
        letters: letters,
        slots: Array(word.length).fill(null),
        currentIndex: 0
      };
      return newFrames;
    });
  };

  // 敵の生成
  const spawnEnemy = async () => {
    if (isGameOverScreen || isGameClearScreen) return;
    const difficulty = getCurrentDifficulty();
    const currentEnemyCount = enemiesRef.current.length;
    const maxEnemies = 5;

    if (currentEnemyCount >= maxEnemies) return;
    if (Math.random() > difficulty.enemySpawnRate * 0.7) return;
    await playSound(soundsRef.current.enemySpawn);

    const enemyTypes = Object.keys(ENEMY_IMAGES) as EnemyType[];
    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    enemyIdRef.current += 1;
    const newEnemy: Enemy = {
      id: enemyIdRef.current,
      type: enemyType,
      x: isSmallScreen ? 50 : 150,
      y: isSmallScreen ? 150 : 280,
      targetX: 0,
      targetY: 0,
      speed: difficulty.enemySpeed * 2.0,
      rotation: new Animated.Value(0),
      scale: new Animated.Value(1),
      hp: 120,
      maxHp: 120,
      attack: 15,
      defense: 10,
      isPoisoned: false,
      poisonTimer: null,
      poisonDamage: 0,
    };

    setEnemies(prevEnemies => {
      const newEnemies = [...prevEnemies, newEnemy];
      enemiesRef.current = newEnemies;
      return newEnemies;
    });
  };

  return (
    <GameLayout>
      <View style={styles.container}>
        {/* レベル表示を絵文字ベースに変更 */}
        <View style={styles.levelTopCenter}>
          <LevelIcon level={currentLevel} width={isSmallScreen ? 50 : 80} height={isSmallScreen ? 50 : 80} />
        </View>
        {/* 設定ボタン・メニュー */}
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
        {/* ゲームオーバー画面 */}
        {isGameOverScreen && (
          <View style={styles.gameOverOverlay} pointerEvents="box-none">
            <View style={styles.resultsContainer}>
              <View style={[styles.winnerImagesContainer, { gap: 40 }]}>
                {Object.values(ENEMY_IMAGES).map((image, index) => (
                  <Image
                    key={index}
                    source={image}
                    style={[styles.winnerImage, { transform: [{ rotate: '270deg' }] }]}
                    resizeMode="contain"
                  />
                ))}
              </View>
              <View style={styles.winnerTextContainer}>
                <Text style={styles.winnerText}>
                  😢 ゲームオーバー
                </Text>
              </View>
            </View>
          </View>
        )}
        {/* ゲームクリア画面 */}
        {isGameClearScreen && (
          <View style={styles.gameOverOverlay} pointerEvents="box-none">
            <View style={styles.resultsContainer}>
              <View style={styles.winnerImagesContainer}>
                {Object.values(BUG_IMAGES).map((image, index) => (
                  <Image
                    key={index}
                    source={image}
                    style={[styles.winnerImage, { transform: [{ rotate: '90deg' }] }]}
                    resizeMode="contain"
                  />
                ))}
              </View>
              <View style={styles.winnerTextContainer}>
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
                  🎉 ゲームクリア！
                </Animated.Text>
              </View>
            </View>
          </View>
        )}
        <View style={styles.gameContainer}>
          <View style={styles.gameArea}>
            <View style={styles.battleArea}>
              {/* 敵のタワー（左側） */}
              <View style={[styles.tower, { left: isSmallScreen ? 0 : 40 }]}> 
                <View style={styles.hpBarOuter}>
                  <View style={[styles.hpBarImproved, {
                    width: `${(playerTower.hp / playerTower.maxHp) * 100}%`,
                    backgroundColor: playerTower.hp > playerTower.maxHp * 0.3 
                      ? 'rgba(233, 30, 99, 0.9)'  // ピンク色（敵の通常時）
                      : 'rgba(233, 30, 99, 0.5)', // 薄いピンク色（敵の危険時）
                    borderRightWidth: 2,
                    borderRightColor: 'rgba(255, 255, 255, 0.3)',
                  }]} />
                  <Text style={styles.hpBarText}>
                    {playerTower.hp}/{playerTower.maxHp}
                  </Text>
                </View>
                <Animated.View style={{
                  transform: [{ translateX: playerTowerShake }],
                  backgroundColor: playerTowerHit ? 'rgba(233, 30, 99, 0.2)' : 'transparent',
                  borderRadius: 20,
                }}>
                  <View style={styles.towerEmojiContainer}>
                    <EnemyCastleIcon width={isSmallScreen ? 80 : 120} height={isSmallScreen ? 130 : 280} />
                  </View>
                </Animated.View>
              </View>
              {/* 味方のタワー（右側） */}
              <View style={[styles.tower, { right: isSmallScreen ? 0 : 40 }]}> 
                <View style={styles.hpBarOuter}>
                  <View style={[styles.hpBarImproved, {
                    width: `${(enemyTower.hp / enemyTower.maxHp) * 100}%`,
                    backgroundColor: enemyTower.hp > enemyTower.maxHp * 0.3 
                      ? 'rgba(33, 150, 243, 0.9)'  // 青色（味方の通常時）
                      : 'rgba(33, 150, 243, 0.5)', // 薄い青色（味方の危険時）
                    borderRightWidth: 2,
                    borderRightColor: 'rgba(255, 255, 255, 0.3)',
                  }]} />
                  <Text style={styles.hpBarText}>
                    {enemyTower.hp}/{enemyTower.maxHp}
                  </Text>
                </View>
                <Animated.View style={{
                  transform: [{ translateX: enemyTowerShake }],
                  backgroundColor: enemyTowerHit ? 'rgba(33, 150, 243, 0.2)' : 'transparent',
                  borderRadius: 20,
                }}>
                  <View style={styles.towerEmojiContainer}>
                    <BugCastleIcon width={isSmallScreen ? 80 : 120} height={isSmallScreen ? 130 : 280} />
                  </View>
                </Animated.View>
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
                  <Text style={styles.levelUpText}>レベルアップ！</Text>
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
                      left: enemy.x,
                      top: enemy.y,
                      transform: [
                        { scale: isAttacking[enemy.id] ? 1.8 : enemy.scale },
                      ],
                    },
                  ]}
                >
                  <Image
                    source={ENEMY_IMAGES[enemy.type]}
                    style={styles.enemyImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              ))}

              {/* 虫の表示 */}
              {bugs.map(bug => (
                <React.Fragment key={bug.id}>
                  <Animated.View
                    style={[
                      styles.bug,
                      {
                        width: BUG_SIZES[bug.type],
                        height: BUG_SIZES[bug.type],
                        left: bug.x,
                        top: bug.y,
                        transform: [
                          { scale: bug.scale },
                        ],
                        opacity: bug.opacity,
                      },
                    ]}
                  >
                    <Image
                      source={BUG_IMAGES[bug.type]}
                      style={styles.bugImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={[styles.questionArea]}>
            {/* 特殊能力ボタンエリア */}
            <View style={styles.abilityButtonsContainer}>
              {bugs.map(bug => (
                <TouchableOpacity
                  key={`ability-${bug.id}`}
                  style={[
                    styles.abilityButtonContainer,
                    {
                      backgroundColor: Date.now() - bug.lastAbilityUse < bug.ability.cooldown
                        ? '#e0e0e0'
                        : BUG_COLORS[bug.type],
                      opacity: Date.now() - bug.lastAbilityUse < bug.ability.cooldown ? 0.7 : 1,
                    }
                  ]}
                  onPress={() => useAbility(bug)}
                  disabled={Date.now() - bug.lastAbilityUse < bug.ability.cooldown}
                >
                  <View style={styles.abilityButtonContent}>
                    <Text style={styles.abilityButtonLabel}>
                      {bug.ability.name}
                    </Text>
                    {Date.now() - bug.lastAbilityUse < bug.ability.cooldown && (
                      <View style={styles.abilityCooldownOverlay}>
                        <Text style={styles.abilityCooldownLabel}>
                          {Math.ceil((bug.ability.cooldown - (Date.now() - bug.lastAbilityUse)) / 1000)}s
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.framesContainer}>
              {frames.map((frame, frameIndex) => (
                <View
                  key={frame.id}
                  style={[
                    styles.frame,
                    {
                      borderColor: BUG_COLORS[frame.id === 1 ? 'kabuto' : frame.id === 2 ? 'kuwagata' : frame.id === 3 ? 'gohon' : 'caucasus'],
                      width: frame.id <= 2 ? '30%' : '15%'
                    }
                  ]}
                >
                  <View style={styles.frameContent}>
                    {frame.id <= 2 ? (
                      // クイズフレーム（1番目と2番目）
                      <>
                        <View style={styles.bugPreview}>
                          <Image
                            source={BUG_IMAGES[frame.id === 1 ? 'kabuto' : 'kuwagata']}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.slotsContainer}>
                          {frame.slots.map((slot, index) => (
                            <Animated.View
                              key={`slot-${index}`}
                              style={[
                                styles.letterSlot,
                                slot ? styles.filledSlot : null,
                                frame.id === 2 && {
                                  borderColor: '#4169E1',
                                  backgroundColor: 'rgba(65, 105, 225, 0.08)',
                                },
                                correctAnswerAnimations[frameIndex]?.[index] && {
                                  transform: [
                                    {
                                      scale: correctAnswerAnimations[frameIndex][index].interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 1.2],
                                      }),
                                    },
                                  ],
                                },
                              ]}
                            >
                              {slot && (
                                <Animated.Text 
                                  style={[
                                    styles.letterSlotText,
                                    frame.id === 2 && { color: '#4169E1' },
                                    correctAnswerAnimations[frameIndex]?.[index] && {
                                      color: correctAnswerAnimations[frameIndex][index].interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [frame.id != 2 ? '#8B4513': '#4169E1' , '#4CAF50'],
                                      }),
                                    },
                                  ]}
                                >
                                  {slot}
                                </Animated.Text>
                              )}
                            </Animated.View>
                          ))}
                        </View>
                        <View style={styles.availableLettersContainer}>
                          {frame.letters.map((letter, index) => (
                            <TouchableOpacity
                              key={`available-${index}`}
                              style={[
                                styles.availableLetter,
                                frame.id === 2 && { backgroundColor: '#4169E1' }
                              ]}
                              onPress={() => handleLetterPress(frameIndex, letter)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.availableLetterText}>
                                {letter}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : (
                      // クールダウンフレーム（3番目と4番目）
                      <TouchableOpacity
                        style={styles.cooldownFrame}
                        onPress={() => handleCooldownFrameClick(frameIndex)}
                        disabled={cooldownProgress[frame.id] < 100}
                      >
                        <View style={styles.cooldownContent}>
                          <Image
                            source={BUG_IMAGES[frame.id === 3 ? 'gohon' : 'caucasus']}
                            style={[
                              styles.cooldownBugImage,
                              cooldownProgress[frame.id] < 100 && styles.cooldownBugImageDisabled
                            ]}
                            resizeMode="contain"
                          />
                          <View style={styles.cooldownTimerContainer}>
                            <View style={styles.cooldownTimerBackground}>
                              <View
                                style={[
                                  styles.cooldownTimerFill,
                                  {
                                    width: `${cooldownProgress[frame.id]}%`,
                                    backgroundColor: frame.id === 3 ? '#CD853F' : '#006400'
                                  }
                                ]}
                              />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
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
    backgroundColor: 'transparent',
  } as ViewStyle,
  gameContainer: {
    flex: 1,
    position: 'relative',
  } as ViewStyle,
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10000,
    padding: 10,
  } as ViewStyle,
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    width: '100%',
    height: isSmallScreen ? screenHeight - 200 : screenHeight - 400,
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
    height: isSmallScreen ? 120 :300,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    padding: isSmallScreen ? 5 : 10,
  } as ViewStyle,
  framesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: isSmallScreen ? 5 : 10,
    height: '100%',
    gap: isSmallScreen ? 1 : 2,
  } as ViewStyle,
  frame: {
    width: '22%',
    height: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4a90e2',
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ perspective: 1000 }],
  } as ViewStyle,
  frameContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
  } as ViewStyle,
  bugPreview: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: isSmallScreen ? 50 : 90,
    height: isSmallScreen ? 50 : 90,
    opacity: 0.95,
    transform: [{ rotate: '5deg' }, { scale: 0.9 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  } as ViewStyle,
  bugPreviewImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.1 }],
  } as ImageStyle,
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: isSmallScreen ? 4 : 8,
    marginTop: isSmallScreen ? 4 : 8,
    gap: isSmallScreen ? 2 : 6,
  } as ViewStyle,
  letterSlot: {
    width: isSmallScreen ? 28 : 55,
    height: isSmallScreen ? 28 : 55,
    borderWidth: 2,
    borderColor: '#8B4513',
    borderRadius: isSmallScreen ? 6 : 12,
    margin: isSmallScreen ? 1 : 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    transform: [{ scale: 1 }], // デフォルトのスケールを追加
  } as ViewStyle,
  correctAnswer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    transform: [{ scale: 1.1 }],
    borderColor: '#4CAF50',
  } as ViewStyle,
  filledSlot: {
    borderColor: '#8B4513',
    transform: [{ scale: 1.05 }],
  } as ViewStyle,
  letterSlotText: {
    color: '#8B4513',
    fontSize: isSmallScreen ? 22 : 38,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,
  availableLettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: isSmallScreen ? 2 : 6,
    marginTop: isSmallScreen ? 4 : 8,
    width: '100%',
    minHeight: isSmallScreen ? 30 : 60,
    borderRadius: 15,
    gap: isSmallScreen ? 2 : 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  } as ViewStyle,
  availableLetter: {
    width: isSmallScreen ? 25 : 50,
    height: isSmallScreen ? 25 : 50,
    backgroundColor: '#8B4513',
    borderRadius: isSmallScreen ? 6 : 12,
    margin: isSmallScreen ? 1 : 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    transform: [{ perspective: 1000 }],
  } as ViewStyle,
  availableLetterText: {
    color: 'white',
    fontSize: isSmallScreen ? 20 : 32,
    fontWeight: 'bold',
  } as TextStyle,
  levelUpContainer: {
    position: 'absolute',
    top: isSmallScreen ? '25%' : '30%',
    left: '50%',
    transform: [
      { translateX: isSmallScreen ? -80 : -100 },
      { translateY: isSmallScreen ? -40 : -50 }
    ],
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    padding: isSmallScreen ? 15 : 20,
    borderRadius: isSmallScreen ? 12 : 15,
    zIndex: 1000,
  } as ViewStyle,
  levelUpText: {
    fontSize: isSmallScreen ? 24 : 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  } as TextStyle,
  comboContainer: {
    position: 'absolute',
    top: isSmallScreen ? 80 : 100,
    left: '50%',
    transform: [{ translateX: isSmallScreen ? -40 : -50 }],
    backgroundColor: 'rgba(226, 132, 74, 0.9)',
    padding: isSmallScreen ? 10 : 15,
    borderRadius: isSmallScreen ? 20 : 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  } as ViewStyle,
  comboText: {
    color: 'white',
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,
  particle: {
    position: 'absolute',
    borderRadius: 50,
    transform: [{ scale: 1 }], // デフォルトのスケールを追加
  } as ViewStyle,
  bug: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 2,
    backgroundColor: 'transparent',
    transform: [{ scale: 0.9 }],
  } as ViewStyle,
  bugImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.1 }],
  } as ImageStyle,
  enemy: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 3,
    backgroundColor: 'transparent',
    transform: [{ scale: 0.9 }],
  } as ViewStyle,
  enemyImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.1 }],
  } as ImageStyle,
  battleResultContainer: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  } as ViewStyle,
  battleResultText: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  abilityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: isSmallScreen ? 0 : 0,
    marginBottom: 0,
    backgroundColor: 'transparent',
    height: isSmallScreen ? 20 : 30,
    alignItems: 'center',
  } as ViewStyle,
  abilityButtonContainer: {
    padding: isSmallScreen ? 4 : 8,
    borderRadius: 10,
    minWidth: isSmallScreen ? 80 : 100,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  } as ViewStyle,
  abilityButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  abilityButtonLabel: {
    color: 'white',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: 'bold',
    textAlign: 'center',
  } as TextStyle,
  abilityCooldownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  abilityCooldownLabel: {
    color: 'white',
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: 'bold',
  } as TextStyle,
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
  scoreAnimation: {
    position: 'absolute',
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  levelTopCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  scoreText: {
    fontSize: isSmallScreen ? 16 : 20,
    fontWeight: 'bold',
    color: '#333',
  } as TextStyle,
  tower: {
    position: 'absolute',
    width: 100,
    height: isSmallScreen ? 160 : 300,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    top: isSmallScreen ? 40 : 80,
  } as ViewStyle,
  towerEmojiContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  hpBarOuter: {
    position: 'relative',
    width: isSmallScreen ? 60 : 110,
    height: isSmallScreen ? 18 : 22,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: isSmallScreen ? 9 : 11,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: isSmallScreen ? 8 : 12,
    marginBottom: isSmallScreen ? 8 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  } as ViewStyle,
  hpBarImproved: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  hpBarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isSmallScreen ? 10 : 14,
    zIndex: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } as TextStyle,
  resultsContainer: {
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 300,
  } as ViewStyle,
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
    marginBottom: 20,
  },
  resultTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  cooldownFrame: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  cooldownContent: {
    width: '100%',
    alignItems: 'center',
    gap: isSmallScreen ? 5 : 10,
  } as ViewStyle,
  cooldownBugImage: {
    width: isSmallScreen ? 50 : 120,
    height: isSmallScreen ? 50 : 120,
    opacity: 1,
  } as ImageStyle,
  cooldownBugImageDisabled: {
    opacity: 0.5,
  } as ImageStyle,
  cooldownTimerContainer: {
    width: '80%',
    alignItems: 'center',
    marginTop: isSmallScreen ? 0 : 0,
  } as ViewStyle,
  cooldownTimerBackground: {
    width: '100%',
    height: isSmallScreen ? 8 : 12,
    backgroundColor: '#e0e0e0',
    borderRadius: isSmallScreen ? 4 : 6,
    overflow: 'hidden',
  } as ViewStyle,
  cooldownTimerFill: {
    height: '100%',
    borderRadius: 6,
  } as ViewStyle,
  winnerImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 20,
    padding: 10,
  } as ViewStyle,
  winnerImage: {
    width: 100,
    height: 100,
    transform: [{ scale: 1.2 }],
  } as ImageStyle,
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  } as ViewStyle,
  winnerTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  } as ViewStyle,
}); 