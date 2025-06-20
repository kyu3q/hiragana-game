import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, ImageStyle, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import BugCastleIcon from '../../assets/images/bugbattle/BugCastleIcon';
import OrangeCastleIcon from '../../assets/images/bugbattle/OrangeCastleIcon';
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
import { useGame } from '../contexts/GameContext';

// 画面サイズの取得（グローバルで宣言）
const { width: rawWidth, height: rawHeight } = Dimensions.get('window');
const screenWidth = Math.max(rawWidth, rawHeight);
const screenHeight = Math.min(rawWidth, rawHeight);
const isSmallScreen =  screenHeight < 768; // 768ptを基準に

// 虫の画像マッピング
const BUG_IMAGES = {
  player1_bug1: require('../../assets/images/bugbattle/player1_bug1.png'),
  player1_bug2: require('../../assets/images/bugbattle/player1_bug2.png'),
  player2_bug1: require('../../assets/images/bugbattle/player2_bug1.png'),
  player2_bug2: require('../../assets/images/bugbattle/player2_bug2.png'),
} as const;

// 敵の画像マッピング
const ENEMY_IMAGES = {
  beetle: require('../../assets/images/bugbattle/enemy1.png'),
  stag: require('../../assets/images/bugbattle/enemy2.png'),
  mantis: require('../../assets/images/bugbattle/enemy3.png'),
} as const;

// 虫のサイズ定数
const BUG_SIZES = {
  player1_bug1: isSmallScreen ? 50 : 80,
  player1_bug2: isSmallScreen ? 50 : 80,
  player2_bug1: isSmallScreen ? 50 : 80,
  player2_bug2: isSmallScreen ? 50 : 80,
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
  isCorrect?: boolean;
}

// 難易度設定
interface Difficulty {
  bugSpeed: number;
  enemySpeed: number;
  enemySpawnRate: number;
  scoreMultiplier: number;
}

const DIFFICULTY: Difficulty = {
  bugSpeed: 0.67,
  enemySpeed: 1.2,
  enemySpawnRate: 0.9,
  scoreMultiplier: 1
};

// 敵の出現間隔（ミリ秒）
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
  1: 'player1_bug1', // 左1
  2: 'player1_bug2', // 左2
  3: 'player2_bug1', // 右1
  4: 'player2_bug2', // 右2
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

// プレイヤーの種類
type PlayerSide = 'left' | 'right';

// プレイヤーの状態
interface PlayerState {
  side: PlayerSide;
  frames: Frame[];
  tower: Tower;
  bugs: Bug[];
  enemies: Enemy[];
  score: number;
  consecutiveCorrect: number;
}

// プレイヤーの色
const PLAYER_COLORS = {
  left: '#FFA500',  // オレンジ
  right: '#4169E1', // 青
} as const;

// 型定義を追加
type GameType = 'shiritori' | 'memory' | 'bugbattle' | 'bugbattle-pvp';

// バトルエリアの高さを定義
const BATTLE_AREA_HEIGHT = isSmallScreen ? 350 : 500;

export default function BugBattlePvP() {
  const router = useRouter();
  const { isHiragana, setIsHiragana } = useGame();
  
  // プレイヤーの状態
  const [leftPlayer, setLeftPlayer] = useState<PlayerState>({
    side: 'left',
    frames: [
      { id: 1, question: null, letters: [], slots: [], cooldown: 0, lastUsed: 0, currentIndex: 0 },
      { id: 2, question: null, letters: [], slots: [], cooldown: 7000, lastUsed: 0, currentIndex: 0 },
    ],
    tower: { hp: 100, maxHp: 100 },
    bugs: [],
    enemies: [],
    score: 0,
    consecutiveCorrect: 0,
  });

  const [rightPlayer, setRightPlayer] = useState<PlayerState>({
    side: 'right',
    frames: [
      { id: 3, question: null, letters: [], slots: [], cooldown: 9000, lastUsed: 0, currentIndex: 0 },
      { id: 4, question: null, letters: [], slots: [], cooldown: 11000, lastUsed: 0, currentIndex: 0 },
    ],
    tower: { hp: 100, maxHp: 100 },
    bugs: [],
    enemies: [],
    score: 0,
    consecutiveCorrect: 0,
  });

  // useRefで最新の状態を参照
  const leftPlayerRef = useRef<PlayerState>(leftPlayer);
  const rightPlayerRef = useRef<PlayerState>(rightPlayer);

  // 状態が更新されたらRefも更新
  useEffect(() => {
    leftPlayerRef.current = leftPlayer;
  }, [leftPlayer]);

  useEffect(() => {
    rightPlayerRef.current = rightPlayer;
  }, [rightPlayer]);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const enemySpawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    { id: 2, question: null, letters: [], slots: [], cooldown: 7000, lastUsed: 0, currentIndex: 0 },
    { id: 3, question: null, letters: [], slots: [], cooldown: 9000, lastUsed: 0, currentIndex: 0 },
    { id: 4, question: null, letters: [], slots: [], cooldown: 11000, lastUsed: 0, currentIndex: 0 },
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
  // 1. 文字色アニメーション用のstateを追加
  const [slotTextColorAnimations, setSlotTextColorAnimations] = useState<{[key: number]: Animated.Value[]}>({});

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
  const [isGameOverScreen, setIsGameOverScreen] = useState(false);
  const [isGameClearScreen, setIsGameClearScreen] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<'left' | 'right' | 'draw' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const textBounceAnim = useRef(new Animated.Value(0)).current;
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSwitchingKana, setSwitchingKana] = useState(false);
  const [isSingleMode, setIsSingleMode] = useState(false);

  // 結果画面のアニメーション
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

  const createParticles = (x: number, y: number, color: string, count: number = 10, type: 'success' | 'failure' = 'success') => {
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      id: particleIdRef.current++,
      x,
      y,
      color,
      size: type === 'failure' ? Math.random() * 8 + 4 : Math.random() * 4 + 2,
      velocity: {
        x: (Math.random() - 0.5) * (type === 'failure' ? 12 : 8),
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
            toValue: type === 'failure' ? 1.5 : 1,
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
          duration: type === 'failure' ? 700 : 500,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: type === 'failure' ? 720 : 360,
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
    initializeGame();
    startGameLoop();

    // クリーンアップ関数
    return () => {
      // インターバルのクリア
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

      // すべてのゲーム状態をリセット
      setGameOver(false);
      setIsGameOverScreen(false);
      setIsGameClearScreen(false);
      setConsecutiveCorrect(0);
      setGameTime(0);
      setQuestionsAnswered(0);
      setLeftPlayer(prev => ({
        ...prev,
        tower: { hp: 100, maxHp: 100 },
        bugs: [],
        enemies: [],
        score: 0,
        consecutiveCorrect: 0
      }));
      setRightPlayer(prev => ({
        ...prev,
        tower: { hp: 100, maxHp: 100 },
        bugs: [],
        enemies: [],
        score: 0,
        consecutiveCorrect: 0
      }));

      // クールダウンフレームの初期化
      setFrames(prevFrames => prevFrames.map(frame => ({
        ...frame,
        lastUsed: 0,
        question: null,
        letters: [],
        slots: Array(frame.slots.length).fill(null),
        currentIndex: 0
      })));
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setIsGameOverScreen(false);
    setIsGameClearScreen(false);
    setShowResult(false);
    setWinner(null);
  };

  // ゲームの初期化
  const initializeGame = () => {
    // 4枠分のクイズを初期化
    for (let i = 0; i < 4; i++) {
      const isLeft = i < 2;
      const playerFramesIndex = isLeft ? i : i - 2;
      generateQuestion(isLeft, playerFramesIndex);
    }
  };

  // ゲームループの開始
  const startGameLoop = () => {
    if (!gameLoopRef.current) {
      const gameLoop = () => {
        if (!gameOver && !isGameOverScreen && !isGameClearScreen) {
          updateGameState();
          gameLoopRef.current = requestAnimationFrame(gameLoop);
        }
      };
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  };

  // 難易度の取得
  const getCurrentDifficulty = (): Difficulty => {
    return DIFFICULTY;
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
      // 左右のプレイヤーの状態を更新
      await Promise.all([
        updatePlayerState(leftPlayer, setLeftPlayer, now),
        updatePlayerState(rightPlayer, setRightPlayer, now)
      ]);
      
      // 衝突判定を実行
      checkCollisions();
    } catch (error) {
      console.error('Error in updateGameState:', error);
    }
  };

  // プレイヤーの状態更新
  const updatePlayerState = (
    player: PlayerState,
    setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>,
    now: number
  ) => {
    setPlayer(prev => ({
      ...prev,
      bugs: updateBugs(prev.bugs, prev.side === 'left').filter(bug => bug.x > -200 && bug.x < screenWidth + 400),
      enemies: updateEnemies(prev.enemies, prev.side)
        .map(enemy => updateEnemyState(enemy, now))
        .filter((enemy): enemy is Enemy => enemy !== null)
        .filter(enemy => enemy.x < screenWidth + 400)
    }));

    // 特殊効果の更新
    setPlayer(prev => ({
      ...prev,
      bugs: prev.bugs.map(bug => {
        if (bug.isDefenseBoosted && bug.defenseBoostTimer && now > bug.defenseBoostTimer) {
          return {
            ...bug,
            defense: bug.baseDefense,
            isDefenseBoosted: false,
            defenseBoostTimer: null
          };
        }
        return bug;
      })
    }));
  };

  // 衝突判定
  const checkCollisions = () => {
    const currentLeftBugs = leftPlayerRef.current.bugs;
    const currentRightBugs = rightPlayerRef.current.bugs;
    const collidedPairs = new Set<string>();
    
    // 虫同士の衝突判定
    currentLeftBugs.forEach(leftBug => {
      currentRightBugs.forEach(rightBug => {
        const pairKey = `${leftBug.id}-${rightBug.id}`;
        if (!collidedPairs.has(pairKey)) {
          if (checkCollision(leftBug, rightBug)) {
            collidedPairs.add(pairKey);
            
            // 左プレイヤーの虫の攻撃
            const leftBugDamage = Math.max(1, leftBug.attack - rightBug.defense);
            rightBug.hp -= leftBugDamage;
            
            // 右プレイヤーの虫の攻撃
            const rightBugDamage = Math.max(1, rightBug.attack - leftBug.defense);
            leftBug.hp -= rightBugDamage;

            playAttackAnimation(leftBug.id);
            playAttackAnimation(rightBug.id);
            createParticles(
              (leftBug.x + rightBug.x) / 2,
              (leftBug.y + rightBug.y) / 2,
              leftBug.hp <= 0 || rightBug.hp <= 0 ? '#F44336' : '#4CAF50',
              30,
              leftBug.hp <= 0 || rightBug.hp <= 0 ? 'failure' : 'success'
            );
            playSound(soundsRef.current.collision);

            if (leftBug.hp <= 0) {
              animateBugDisappearance(leftBug);
            }
            if (rightBug.hp <= 0) {
              animateBugDisappearance(rightBug);
            }
            shakeScreen();
          }
        }
      });
    });
    
    // タワーとの衝突
    // 衝突したバグIDを記録して多重ダメージを防ぐ
    const bugsToRemove: number[] = [];
    currentLeftBugs.forEach(bug => {
      // 右タワーとの衝突判定（bugbattle.tsxに合わせて動的計算）
      const towerRightEdge = screenWidth - (isSmallScreen ? 100 : 40);
      const collisionOffset = isSmallScreen ? 80 : 120;
      if (bug.x >= towerRightEdge - collisionOffset) {
        if (!bugsToRemove.includes(bug.id)) {
          updateTowerHp(rightPlayer, setRightPlayer, 3);
          animateBugDisappearance(bug);
          bugsToRemove.push(bug.id);
        }
      }
    });
    currentRightBugs.forEach(bug => {
      // 左タワーとの衝突判定（bugbattle.tsxに合わせて動的計算）
      const towerLeftEdge = isSmallScreen ? 80 : 140;
      const collisionOffset = isSmallScreen ? 20 : 40;
      if (bug.x <= towerLeftEdge - collisionOffset) {
        if (!bugsToRemove.includes(bug.id)) {
          updateTowerHp(leftPlayer, setLeftPlayer, 3);
          animateBugDisappearance(bug);
          bugsToRemove.push(bug.id);
        }
      }
    });
  };

  // タワーのHPを更新
  const updateTowerHp = (
    player: PlayerState,
    setPlayer: React.Dispatch<React.SetStateAction<PlayerState>>,
    damage: number
  ) => {
    setPlayer(prev => {
      const newHp = Math.max(0, prev.tower.hp - damage);
      if (newHp <= 0 && prev.tower.hp > 0) {
        setGameOver(true);
        setShowResult(true);
        const leftTowerHp = leftPlayer.tower.hp;
        const rightTowerHp = rightPlayer.tower.hp;
        
        if (leftTowerHp <= 0 && rightTowerHp <= 0) {
          setWinner('draw');
        } else if (rightTowerHp <= 0) {
          setWinner('left');
        } else {
          setWinner('right');
        }

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
      }
      playSound(soundsRef.current.playerTowerHit);
      return {
        ...prev,
        tower: { ...prev.tower, hp: newHp }
      };
    });
    animateTowerHit(player.side === 'left');
  };

  // 衝突判定
  const checkCollision = (bug1: Bug, bug2: Bug | Enemy) => {
    // 中心点の距離を計算
    const dx = bug1.x - bug2.x;
    const dy = bug1.y - bug2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 虫の大きさを考慮した衝突判定
    const bug1Radius = BUG_SIZES[bug1.type] * 0.5;
    const bug2Radius = 'type' in bug2 && bug2.type in BUG_SIZES 
      ? BUG_SIZES[bug2.type as BugType] * 0.5 
      : ENEMY_SIZES[bug2.type as EnemyType] * 0.5;
    const collisionThreshold = (bug1Radius + bug2Radius) * 1.2;
    
    return distance < collisionThreshold;
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
        if (bug.x < screenWidth / 2) {
          setLeftPlayer(prev => ({
            ...prev,
            bugs: prev.bugs.filter(b => b.id !== bug.id)
          }));
        } else {
          setRightPlayer(prev => ({
            ...prev,
            bugs: prev.bugs.filter(b => b.id !== bug.id)
          }));
        }
      });
    });
  };

  // 敵の消滅アニメーション
  const animateEnemyDisappearance = (enemy: Enemy) => {
    Animated.parallel([
      Animated.timing(enemy.scale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // アニメーション完了後に状態を更新
      requestAnimationFrame(() => {
        if (enemy.x < screenWidth / 2) {
          setLeftPlayer(prev => ({
            ...prev,
            enemies: prev.enemies.filter(e => e.id !== enemy.id)
          }));
        } else {
          setRightPlayer(prev => ({
            ...prev,
            enemies: prev.enemies.filter(e => e.id !== enemy.id)
          }));
        }
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

  // リトライ状態の変更
  useEffect(() => {
    if (isRetrying) {
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

      // すべてのゲーム状態をリセット
      setGameOver(false);
      setIsGameOverScreen(false);
      setIsGameClearScreen(false);
      setConsecutiveCorrect(0);
      setGameTime(0);
      setQuestionsAnswered(0);
      setLeftPlayer(prev => ({
        ...prev,
        tower: { hp: 100, maxHp: 100 },
        bugs: [],
        enemies: [],
        score: 0,
        consecutiveCorrect: 0
      }));
      setRightPlayer(prev => ({
        ...prev,
        tower: { hp: 100, maxHp: 100 },
        bugs: [],
        enemies: [],
        score: 0,
        consecutiveCorrect: 0
      }));

      // クールダウンフレームの初期化
      setFrames(prevFrames => prevFrames.map(frame => ({
        ...frame,
        lastUsed: 0,
        question: null,
        letters: [],
        slots: Array(frame.slots.length).fill(null),
        currentIndex: 0
      })));

      // 少し遅延を入れてから初期化を実行
      setTimeout(() => {
        initializeGame();
        startGameLoop();
        setIsRetrying(false);
      }, 100);
    }
  }, [isRetrying]);

  // カタカタ/ひらがなに切替状態の変更
  useEffect(() => {
    if (isSwitchingKana) {
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

      // ゲーム状態をリセット
      setIsGameOverScreen(false);
      setIsGameClearScreen(false);
      setGameOver(false);
      setConsecutiveCorrect(0);
      setGameTime(0);
      setQuestionsAnswered(0);
      setLeftPlayer(prev => ({
        ...prev,
        tower: { hp: 100, maxHp: 100 },
        bugs: [],
        enemies: [],
        score: 0,
        consecutiveCorrect: 0
      }));
      setRightPlayer(prev => ({
        ...prev,
        tower: { hp: 100, maxHp: 100 },
        bugs: [],
        enemies: [],
        score: 0,
        consecutiveCorrect: 0
      }));

      // クールダウンフレームの初期化
      setFrames(prevFrames => prevFrames.map(frame => ({
        ...frame,
        lastUsed: 0,
        question: null,
        letters: [],
        slots: Array(frame.slots.length).fill(null),
        currentIndex: 0
      })));

      // 少し遅延を入れてから初期化を実行
      setTimeout(() => {
        initializeGame();
        startGameLoop();
        setSwitchingKana(false);
      }, 100);
    }
  }, [isSwitchingKana]);

  useEffect(() => {
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
      setLeftPlayer(prev => ({
        ...prev,
        bugs: [],
        enemies: []
      }));
      setRightPlayer(prev => ({
        ...prev,
        bugs: [],
        enemies: []
      }));
    }
  }, [isGameOverScreen, isGameClearScreen]);

  const handleSwitchKana = () => {
    setSwitchingKana(true);
    setIsHiragana(!isHiragana);
  };

  const handleSwitchMode = () => {
    setIsSingleMode(!isSingleMode);
    router.replace('/games/bugbattle');
  };

  // 味方の生成間隔（ミリ秒）
  const BUG_SPAWN_COOLDOWN = 1000; // 1秒間隔
  const lastBugSpawnTimeRef = useRef<number>(0);

  // 味方の生成
  const spawnBug = (bugType: BugType, isLeft: boolean) => {
    if (isGameOverScreen || isGameClearScreen) return;
    
    const now = Date.now();
    if (now - lastBugSpawnTimeRef.current < BUG_SPAWN_COOLDOWN) {
      return;
    }
    
    const currentBugCount = leftPlayer.bugs.length + rightPlayer.bugs.length;
    const maxBugs = 5;
    
    if (currentBugCount >= maxBugs) {
      return;
    }

    lastBugSpawnTimeRef.current = now;

    const difficulty = getCurrentDifficulty();
    bugIdRef.current += 1;
    const newBug: Bug = {
      id: bugIdRef.current,
      type: bugType,
      x: isLeft ? (isSmallScreen ? 40 : 100) : (screenWidth - (isSmallScreen ? 200 : 200)),
      y: isSmallScreen ? 150 : 280,
      targetX: isLeft ? screenWidth : 0,
      targetY: 0,
      speed: difficulty.bugSpeed * 2.5,
      rotation: new Animated.Value(1),
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

    if (isLeft) {
      setLeftPlayer(prev => ({
        ...prev,
        bugs: [...prev.bugs, newBug]
      }));
      // 左プレイヤー（敵側）の出現音
      console.log('[spawnBug] enemySpawn sound:', soundsRef.current.enemySpawn);
      playSound(soundsRef.current.enemySpawn);
    } else {
      setRightPlayer(prev => ({
        ...prev,
        bugs: [...prev.bugs, newBug]
      }));
      // 右プレイヤー（味方側）の出現音
      playSound(soundsRef.current.bugSpawn);
    }
    console.log('[spawnBug]', { id: newBug.id, type: bugType, x: newBug.x, y: newBug.y, isLeft });
  };

  // 問題の生成
  const generateQuestion = (isLeft: boolean, playerFramesIndex: number) => {
    const wordLists = getWordLists(isHiragana);
    const wordList = wordLists[1]; // レベル1の単語リストを使用
    // ランダムに単語を選択
    const randomIndex = Math.floor(Math.random() * wordList.length);
    const word = wordList[randomIndex];
    // 文字をシャッフル
    const letters = word.split('').sort(() => Math.random() - 0.5);
    // フレームの状態を更新
    if (isLeft) {
      setLeftPlayer(prev => {
        const newFrames = [...prev.frames];
        newFrames[playerFramesIndex] = {
          ...newFrames[playerFramesIndex],
          question: word,
          letters: letters,
          slots: Array(word.length).fill(null),
          currentIndex: 0
        };
        return { ...prev, frames: newFrames };
      });
    } else {
      setRightPlayer(prev => {
        const newFrames = [...prev.frames];
        newFrames[playerFramesIndex] = {
          ...newFrames[playerFramesIndex],
          question: word,
          letters: letters,
          slots: Array(word.length).fill(null),
          currentIndex: 0
        };
        return { ...prev, frames: newFrames };
      });
    }
  };

  // 答えの確認
  const checkAnswer = (
    isLeft: boolean,
    playerFramesIndex: number,
    globalFrameIndex: number,
    slots: string[]
  ) => {
    const player = isLeft ? leftPlayer : rightPlayer;
    const frame = player.frames[playerFramesIndex];
    if (!frame?.question) return;
    const answer = slots.join('');
    if (answer === frame.question) {
      // 正解時の演出
      const playerSetter = isLeft ? setLeftPlayer : setRightPlayer;
      playerSetter(prev => {
        const newFrames = prev.frames.map((f, idx) =>
          idx === playerFramesIndex
            ? {
                ...f,
                slots: f.slots.map(slot => slot),
                isCorrect: true
              }
            : f
        );
        return { ...prev, frames: newFrames };
      });

      // 正解アニメーション
      const animations = frame.slots.map(() => new Animated.Value(0));
      setCorrectAnswerAnimations(prev => ({
        ...prev,
        [frame.id]: animations
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

      // パーティクルエフェクト
      createParticles(
        isLeft ? 100 : screenWidth - 100,
        isSmallScreen ? 150 : 280,
        isLeft ? PLAYER_COLORS.left : PLAYER_COLORS.right,
        50,
        'success'
      );
      const bugType = FRAME_BUG_TYPES[globalFrameIndex + 1];
      if (bugType) {
        setTimeout(() => {
          spawnBug(bugType, isLeft);
        }, 500);
      }
      // 6秒後に新しい問題を生成
      setTimeout(() => {
        playerSetter(prev => {
          const newFrames = prev.frames.map((f, idx) =>
            idx === playerFramesIndex
              ? {
                  ...f,
                  isCorrect: false
                }
              : f
          );
          return { ...prev, frames: newFrames };
        });
        generateQuestion(isLeft, playerFramesIndex);
      }, 6000);
    } else {
      // 不正解時の処理
      const playerSetter = isLeft ? setLeftPlayer : setRightPlayer;
      playerSetter(prev => {
        const newFrames = prev.frames.map((f, idx) =>
          idx === playerFramesIndex
            ? {
                ...f,
                slots: Array(f.question?.length || 0).fill(null),
                letters: f.question ? f.question.split('').sort(() => Math.random() - 0.5) : [],
              }
            : f
        );
        return { ...prev, frames: newFrames };
      });
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
    if (type === 'failure') {
      setIsGameOver(true);
      setShowResult(true);
      const leftTowerHp = leftPlayer.tower.hp;
      const rightTowerHp = rightPlayer.tower.hp;
      
      if (leftTowerHp <= 0 && rightTowerHp <= 0) {
        setWinner('draw');
      } else if (rightTowerHp <= 0) {
        setWinner('left');
      } else {
        setWinner('right');
      }
      
      playSound(soundsRef.current.enemyTowerHit);
    }
  };

  // 文字カードのクリック処理
  const handleLetterPress = (frameIndex: number, letter: string) => {
    if (isGameOverScreen || isGameClearScreen) return;
    const isLeft = frameIndex < 2;
    const playerFramesIndex = isLeft ? frameIndex : frameIndex - 2;
    const playerSetter = isLeft ? setLeftPlayer : setRightPlayer;
    const player = isLeft ? leftPlayer : rightPlayer;
    const targetFrame = player.frames[playerFramesIndex];
    if (!targetFrame?.question) return;
    // 空いているスロットを探す
    const emptySlotIndex = targetFrame.slots.findIndex(slot => slot === null);
    if (emptySlotIndex !== -1) {
      playerSetter(prev => {
        const newFrames = prev.frames.map((frame, idx) =>
          idx === playerFramesIndex
            ? {
                ...frame,
                slots: frame.slots.map((l, i) => i === emptySlotIndex ? letter : l),
                letters: frame.letters.filter(l => l !== letter),
              }
            : frame
        );
        return { ...prev, frames: newFrames };
      });
      // すべてのスロットが埋まったら判定
      const updatedSlots = targetFrame.slots.map((l, i) => i === emptySlotIndex ? letter : l);
      if (updatedSlots.every(l => l !== null)) {
        checkAnswer(isLeft, playerFramesIndex, frameIndex, updatedSlots as string[]);
      }
    }
  };

  // 特殊能力を使用する関数を修正
  const useAbility = (bug: Bug) => {
    const now = Date.now();
    if (now - bug.lastAbilityUse < bug.ability.cooldown) {
      return;
    }

    // 虫の種類に基づいて音声を再生
    switch (bug.type) {
      case 'player1_bug1':
        playSound(soundsRef.current.abilityLadybug);
        break;
      case 'player1_bug2':
        playSound(soundsRef.current.abilityWasp);
        break;
      case 'player2_bug1':
        playSound(soundsRef.current.abilityButterfly);
        break;
      case 'player2_bug2':
        playSound(soundsRef.current.abilityFirefly);
        break;
    }

    bug.lastAbilityUse = now;
    // 左右どちらの虫かで敵を正しく選択
    const isLeftBug = leftPlayer.bugs.some(b => b.id === bug.id);
    bug.ability.effect(bug, isLeftBug ? leftPlayer.enemies : rightPlayer.enemies);
  };

  // 特殊能力の定義
  const BUG_ABILITIES: Record<BugType, BugAbility> = {
    player2_bug1: {
      name: '角の突進',
      description: '強力な角で敵を突き飛ばし、一時的に動きを鈍らせます',
      cooldown: 8000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // bugbattleのkabuto能力
        if (!enemies || enemies.length === 0) return;
        const nearestEnemy = enemies.reduce((nearest, current) => {
          if (!nearest) return current;
          const nearestDist = Math.sqrt(Math.pow(nearest.x - bug.x, 2) + Math.pow(nearest.y - bug.y, 2));
          const currentDist = Math.sqrt(Math.pow(current.x - bug.x, 2) + Math.pow(current.y - bug.y, 2));
          return currentDist < nearestDist ? current : nearest;
        }, null as Enemy | null);
        if (!nearestEnemy) return;
        nearestEnemy.speed *= 0.3;
        createParticles(nearestEnemy.x, nearestEnemy.y, '#8B4513', 30, 'success');
        console.log('[ability] playSound: abilityLadybug');
        void playSound(soundsRef.current.abilityLadybug);
        Animated.sequence([
          Animated.timing(bug.scale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
          Animated.timing(bug.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      },
    },
    player2_bug2: {
      name: '大アゴの挟撃',
      description: '強力な大アゴで敵を挟み、防御力を一時的に下げます',
      cooldown: 12000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // bugbattleのkuwagata能力
        if (!enemies || enemies.length === 0) return;
        const nearestEnemy = enemies.reduce((nearest, current) => {
          if (!nearest) return current;
          const nearestDist = Math.sqrt(Math.pow(nearest.x - bug.x, 2) + Math.pow(nearest.y - bug.y, 2));
          const currentDist = Math.sqrt(Math.pow(current.x - bug.x, 2) + Math.pow(current.y - bug.y, 2));
          return currentDist < nearestDist ? current : nearest;
        }, null as Enemy | null);
        if (!nearestEnemy) return;
        nearestEnemy.defense *= 0.3;
        createParticles(nearestEnemy.x, nearestEnemy.y, '#2F4F4F', 30, 'success');
        console.log('[ability] playSound: abilityWasp');
        void playSound(soundsRef.current.abilityWasp);
        Animated.sequence([
          Animated.timing(bug.scale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
          Animated.timing(bug.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      },
    },
    player1_bug1: {
      name: '五本角の突撃',
      description: '五本の角で敵を貫き、攻撃力を一時的に下げます',
      cooldown: 15000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // bugbattleのgohon能力
        if (!enemies || enemies.length === 0) return;
        const nearestEnemy = enemies.reduce((nearest, current) => {
          if (!nearest) return current;
          const nearestDist = Math.sqrt(Math.pow(nearest.x - bug.x, 2) + Math.pow(nearest.y - bug.y, 2));
          const currentDist = Math.sqrt(Math.pow(current.x - bug.x, 2) + Math.pow(current.y - bug.y, 2));
          return currentDist < nearestDist ? current : nearest;
        }, null as Enemy | null);
        if (!nearestEnemy) return;
        nearestEnemy.attack *= 0.3;
        createParticles(nearestEnemy.x, nearestEnemy.y, '#CD853F', 30, 'success');
        console.log('[ability] playSound: abilityButterfly');
        void playSound(soundsRef.current.abilityButterfly);
        Animated.sequence([
          Animated.timing(bug.scale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
          Animated.timing(bug.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      },
    },
    player1_bug2: {
      name: '王者の威圧',
      description: '世界最大のカブトムシとしての威圧で、周囲の敵の能力を一時的に下げます',
      cooldown: 20000,
      effect: (bug: Bug, enemies: Enemy[]) => {
        // bugbattleのcaucasus能力
        const updatedEnemies = enemies.map(enemy => {
          const distance = Math.sqrt(Math.pow(enemy.x - bug.x, 2) + Math.pow(enemy.y - bug.y, 2));
          if (distance < 250) {
            enemy.attack *= 0.5;
            enemy.defense *= 0.5;
            enemy.speed *= 0.5;
            createParticles(enemy.x, enemy.y, '#006400', 20, 'success');
          }
          return enemy;
        });
        // 敵の位置に基づいて適切なプレイヤーの状態を更新
        if (bug.x < screenWidth / 2) {
          setRightPlayer(prev => ({ ...prev, enemies: updatedEnemies }));
        } else {
          setLeftPlayer(prev => ({ ...prev, enemies: updatedEnemies }));
        }
        createParticles(bug.x, bug.y, '#006400', 50, 'success');
        console.log('[ability] playSound: abilityFirefly');
        void playSound(soundsRef.current.abilityFirefly);
        Animated.sequence([
          Animated.timing(bug.scale, { toValue: 1.8, duration: 300, useNativeDriver: true }),
          Animated.timing(bug.scale, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      },
    },
  };

  // 敵の状態更新を修正
  const updateEnemyState = (enemy: Enemy, now: number) => {
    if (enemy.isPoisoned && enemy.poisonTimer && now > enemy.poisonTimer) {
      return {
        ...enemy,
        isPoisoned: false,
        poisonTimer: null,
        poisonDamage: 0
      };
    } else if (enemy.isPoisoned) {
      const newHp = enemy.hp - enemy.poisonDamage;
      if (newHp <= 0) {
        animateEnemyDisappearance(enemy);
        return null;
      }
      return { ...enemy, hp: newHp };
    }
    return enemy;
  };

  // 虫の更新処理を直線移動に修正
  const updateBugs = (bugs: Bug[], isLeft: boolean) => {
    const updated = bugs.map(bug => {
      const beforeX = bug.x;
      if (isLeft) {
        bug.x += bug.speed;
      } else {
        bug.x -= bug.speed;
      }
      return bug;
    }).filter(bug => bug.x > -200 && bug.x < screenWidth + 400);
    return updated;
  };

  // 敵の生成
  const spawnEnemy = async () => {
    if (isGameOverScreen || isGameClearScreen) return;
    const difficulty = getCurrentDifficulty();
    const currentEnemyCount = leftPlayer.enemies.length + rightPlayer.enemies.length;
    const maxEnemies = 5;

    if (currentEnemyCount >= maxEnemies) return;
  };

  // 敵の更新処理
  const updateEnemies = (enemies: Enemy[], playerSide: PlayerSide): Enemy[] => {
    return enemies.map(enemy => {
      const dx = enemy.targetX - enemy.x;
      const dy = enemy.targetY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 5) {
        enemy.targetX = Math.random() * screenWidth;
        enemy.targetY = Math.random() * screenHeight;
      } else {
        enemy.x += (dx / distance) * enemy.speed;
        enemy.y += (dy / distance) * enemy.speed;
      }
      
      return enemy;
    });
  };

  // タワー攻撃時のアニメーション
  const animateTowerHit = (isLeftPlayer: boolean) => {
    const shakeAnimation = isLeftPlayer ? playerTowerShake : enemyTowerShake;
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
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // バトルエリアの虫・敵のy座標を制限
  const clampY = (y: number) => Math.max(0, Math.min(y, BATTLE_AREA_HEIGHT - 80));

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
            onSwitchMode={handleSwitchMode}
            isHiragana={isHiragana}
            isSingleMode={isSingleMode}
            currentGame="bugbattle"
          />
          <View style={styles.resultArea}>
            <View style={styles.resultContent}>
              <View style={styles.winnerImagesContainer}>
                {winner === 'left' ? (
                  // 左プレイヤーの虫を表示
                  Object.values(BUG_IMAGES).slice(0, 2).map((image, index) => (
                    <Image
                      key={index}
                      source={image}
                      style={[styles.winnerImage, { transform: [{ rotate: '270deg' }] }]}
                      resizeMode="contain"
                    />
                  ))
                ) : winner === 'right' ? (
                  // 右プレイヤーの虫を表示
                  Object.values(BUG_IMAGES).slice(2, 4).map((image, index) => (
                    <Image
                      key={index}
                      source={image}
                      style={[styles.winnerImage, { transform: [{ rotate: '90deg' }] }]}
                      resizeMode="contain"
                    />
                  ))
                ) : (
                  // 引き分けの場合は両方の虫を表示
                  Object.values(BUG_IMAGES).map((image, index) => (
                    <Image
                      key={index}
                      source={image}
                      style={[styles.winnerImage, { transform: [{ rotate: index < 2 ? '270deg' : '90deg' }] }]}
                      resizeMode="contain"
                    />
                  ))
                )}
              </View>
              <Animated.Text style={[
                styles.winnerText,
                winner === 'left' ? styles.lionColor : winner === 'right' ? styles.dogColor : styles.drawColor,
                textBounceStyle
              ]}>
                <Text>🎉{winner === 'draw' ? '引き分け！' : `${winner === 'left' ? '🦁' : '🐶'}の勝ち！`}</Text>
              </Animated.Text>
            </View>
          </View>
        </View>
      </GameLayout>
    );
  }

  return (
    <GameLayout>
      <View style={styles.container}>
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
          onSwitchMode={handleSwitchMode}
          isHiragana={isHiragana}
          isSingleMode={isSingleMode}
          currentGame="bugbattle"
        />

        <View style={styles.gameContainer}>
          <View style={styles.gameArea}>
            <View style={styles.battleArea}>
              {/* 左タワー */}
              <View style={[styles.tower, { left: isSmallScreen ? 0 : 40 }]}> 
                <View style={styles.hpBarOuter}>
                  <View style={[styles.hpBarImproved, {
                    width: `${(leftPlayer.tower.hp / leftPlayer.tower.maxHp) * 100}%`,
                    backgroundColor: leftPlayer.tower.hp > leftPlayer.tower.maxHp * 0.3 
                      ? 'rgba(255, 165, 0, 0.9)'  // オレンジ色（通常時）
                      : 'rgba(255, 165, 0, 0.5)', // 薄いオレンジ色（危険時）
                    borderRightWidth: 2,
                    borderRightColor: 'rgba(255, 255, 255, 0.3)',
                  }]} />
                  <Text style={styles.hpBarText}>
                    {leftPlayer.tower.hp}/{leftPlayer.tower.maxHp}
                  </Text>
                </View>
                <Animated.View style={{
                  transform: [{ translateX: playerTowerShake }],
                  backgroundColor: playerTowerHit ? 'rgba(255, 165, 0, 0.2)' : 'transparent',
                  borderRadius: 20,
                }}>
                  <View style={styles.towerEmojiContainer}>
                    <OrangeCastleIcon width={isSmallScreen ? 80 : 120} height={isSmallScreen ? 130 : 280} />
                  </View>
                </Animated.View>
              </View>

              {/* 右タワー */}
              <View style={[styles.tower, { right: isSmallScreen ? 0 : 40 }]}> 
                <View style={styles.hpBarOuter}>
                  <View style={[styles.hpBarImproved, {
                    width: `${(rightPlayer.tower.hp / rightPlayer.tower.maxHp) * 100}%`,
                    backgroundColor: rightPlayer.tower.hp > rightPlayer.tower.maxHp * 0.3 
                      ? 'rgba(33, 150, 243, 0.9)'  // 青色（味方の通常時）
                      : 'rgba(33, 150, 243, 0.5)', // 薄い青色（味方の危険時）
                    borderRightWidth: 2,
                    borderRightColor: 'rgba(255, 255, 255, 0.3)',
                  }]} />
                  <Text style={styles.hpBarText}>
                    {rightPlayer.tower.hp}/{rightPlayer.tower.maxHp}
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

              {/* 虫の描画 */}
              {leftPlayer.bugs.map(bug => (
                <Animated.View
                  key={`l-bug-${bug.id}`}
                  style={{
                    position: 'absolute',
                    left: bug.x,
                    top: clampY(bug.y),
                    width: BUG_SIZES[bug.type],
                    height: BUG_SIZES[bug.type],
                    transform: [{ scale: bug.scale }],
                    opacity: bug.opacity,
                    zIndex: 2,
                  }}
                >
                  <Animated.Image
                    source={BUG_IMAGES[bug.type]}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </Animated.View>
              ))}
              {rightPlayer.bugs.map(bug => (
                <Animated.View
                  key={`r-bug-${bug.id}`}
                  style={{
                    position: 'absolute',
                    left: bug.x,
                    top: clampY(bug.y),
                    width: BUG_SIZES[bug.type],
                    height: BUG_SIZES[bug.type],
                    transform: [{ scale: bug.scale }],
                    opacity: bug.opacity,
                    zIndex: 2,
                  }}
                >
                  <Animated.Image
                    source={BUG_IMAGES[bug.type]}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </Animated.View>
              ))}
              {/* パーティクル */}
              {particles.map(particle => (
                <Animated.View
                  key={particle.id}
                  style={[
                    styles.particle,
                    {
                      left: particle.x,
                      top: particle.y,
                      backgroundColor: particle.color,
                      transform: [
                        { scale: particle.scale },
                        { rotate: particle.rotation.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }) },
                      ],
                      opacity: particle.opacity,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* クイズエリア（下部） */}
          <View style={styles.questionArea}>
             {/* 特殊能力ボタンエリア */}
            <View style={{ flexDirection: 'row', width: '100%', marginBottom: 0 }}>
              {/* 左プレイヤーの特殊能力ボタン */}
              <View style={styles.abilityButtonsContainer}> 
                {leftPlayer.bugs.map(bug => (
                  <TouchableOpacity
                    key={`ability-left-${bug.id}`}
                    style={[
                      styles.abilityButtonContainer,
                      {
                        backgroundColor: Date.now() - bug.lastAbilityUse < bug.ability.cooldown
                          ? '#e0e0e0'
                          : PLAYER_COLORS.left,
                        opacity: Date.now() - bug.lastAbilityUse < bug.ability.cooldown ? 0.7 : 1,
                        marginRight: 8,
                      }
                    ]}
                    onPress={() => useAbility(bug)}
                    disabled={Date.now() - bug.lastAbilityUse < bug.ability.cooldown}
                  >
                    <View style={styles.abilityButtonContent}>
                      <Animated.Text style={styles.abilityButtonLabel}>{bug.ability.name}</Animated.Text>
                      {Date.now() - bug.lastAbilityUse < bug.ability.cooldown && (
                        <View style={styles.abilityCooldownOverlay}>
                          <Animated.Text style={styles.abilityCooldownLabel}>
                            {Math.ceil((bug.ability.cooldown - (Date.now() - bug.lastAbilityUse)) / 1000)}s
                          </Animated.Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {/* 右プレイヤーの特殊能力ボタン */}
              <View style={[styles.abilityButtonsContainer, { flex: 1, justifyContent: 'flex-end' }]}> 
                {rightPlayer.bugs.map(bug => (
                  <TouchableOpacity
                    key={`ability-right-${bug.id}`}
                    style={[
                      styles.abilityButtonContainer,
                      {
                        backgroundColor: Date.now() - bug.lastAbilityUse < bug.ability.cooldown
                          ? '#e0e0e0'
                          : PLAYER_COLORS.right,
                        opacity: Date.now() - bug.lastAbilityUse < bug.ability.cooldown ? 0.7 : 1,
                        marginLeft: 8,
                      }
                    ]}
                    onPress={() => useAbility(bug)}
                    disabled={Date.now() - bug.lastAbilityUse < bug.ability.cooldown}
                  >
                    <View style={styles.abilityButtonContent}>
                      <Animated.Text style={styles.abilityButtonLabel}>{bug.ability.name}</Animated.Text>
                      {Date.now() - bug.lastAbilityUse < bug.ability.cooldown && (
                        <View style={styles.abilityCooldownOverlay}>
                          <Animated.Text style={styles.abilityCooldownLabel}>
                            {Math.ceil((bug.ability.cooldown - (Date.now() - bug.lastAbilityUse)) / 1000)}s
                          </Animated.Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {/* クイズ枠 */}
            <View style={styles.framesContainer}>
              {[0,1,2,3].map(frameIndex => {
                const isLeft = frameIndex < 2;
                const player = isLeft ? leftPlayer : rightPlayer;
                const frame = player.frames[isLeft ? frameIndex : frameIndex - 2];
                // bug画像のタイプを枠番号で決定
                const bugType = FRAME_BUG_TYPES[frameIndex + 1];
                return (
                  <View
                    key={frame.id}
                    style={[
                        styles.frame,
                        { borderColor: isLeft ? PLAYER_COLORS.left : PLAYER_COLORS.right,
                          width: '23%' }
                    ]}
                  >
                    <View style={styles.frameContent}> 
                      <View style={styles.playerIconContainer}>
                        <Text style={styles.playerIcon}>
                          {isLeft ? '🦁' : '🐶'}
                        </Text>
                      </View>
                      <View style={styles.bugPreview}>
                        <Image
                          source={BUG_IMAGES[bugType]}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.slotsContainer}>
                        {frame.slots.map((slot, slotIndex) => {
                          let animatedColor: string | "#FFA500" | "#4169E1" = isLeft ? PLAYER_COLORS.left : PLAYER_COLORS.right;
                          let animatedScale: number = 1;
                          if (correctAnswerAnimations[frame.id]?.[slotIndex]) {
                            animatedColor = correctAnswerAnimations[frame.id][slotIndex].interpolate({
                              inputRange: [0, 1],
                              outputRange: [isLeft ? PLAYER_COLORS.left : PLAYER_COLORS.right, '#BEAE52']
                            }) as unknown as string;
                            animatedScale = correctAnswerAnimations[frame.id][slotIndex].interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.2]
                            }) as unknown as number;
                          }
                          return (
                            <Animated.View
                              key={slotIndex}
                              style={[
                                styles.slot,
                                {
                                  borderColor: isLeft ? PLAYER_COLORS.left : PLAYER_COLORS.right,
                                  backgroundColor: isLeft ? 'rgba(255, 152, 0, 0.08)' : 'rgba(65, 105, 225, 0.08)'
                                },
                                slot && styles.slotFilled,
                                { transform: [{ scale: animatedScale }] }
                              ] as any}
                            >
                              {slot && (
                                <Animated.Text
                                  style={[
                                    styles.slotText,
                                    { color: animatedColor }
                                  ] as any}
                                >
                                  {slot}
                                </Animated.Text>
                              )}
                            </Animated.View>
                          );
                        })}
                      </View>
                      <View style={styles.lettersContainer}>
                        {frame.letters.map((letter, letterIndex) => (
                          <TouchableOpacity
                            key={letterIndex}
                            style={[
                              styles.letterButton,
                              { backgroundColor: isLeft ? '#FFA500' : '#4169E1' },
                            ]}
                            onPress={() => handleLetterPress(frameIndex, letter)}
                          >
                            <Animated.Text style={styles.letterText}>{letter}</Animated.Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}
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
  gameArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    width: '100%',
    height: isSmallScreen ? screenHeight - 200 : screenHeight - 400,
  } as ViewStyle,
  
  // バトルエリア関連
  battleArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    zIndex: 1,
    overflow: 'visible',
  } as ViewStyle,

  // タワー関連
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

  // クイズエリア関連
  questionArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: isSmallScreen ? 120 : 300,
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
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
  } as ViewStyle,
  slot: {
    width: isSmallScreen ? 32 : 48,
    height: isSmallScreen ? 32 : 48,
    borderWidth: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: isSmallScreen ? 2 : 4,
  } as ViewStyle,
  slotFilled: {
    backgroundColor: '#F0F0F0',
  } as ViewStyle,
  slotText: {
    fontSize: isSmallScreen ? 20 : 28,
    fontWeight: 'bold',
  } as TextStyle,
  lettersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
  } as ViewStyle,
  letterButton: {
    width: isSmallScreen ? 32 : 48,
    height: isSmallScreen ? 32 : 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: isSmallScreen ? 2 : 4,
  } as ViewStyle,
  letterText: {
    color: 'white',
    fontSize: isSmallScreen ? 20 : 28,
    fontWeight: 'bold',
  } as TextStyle,

  // 特殊能力ボタン関連
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

  // アニメーション関連
  particle: {
    position: 'absolute',
    borderRadius: 50,
  } as ViewStyle,
  levelUpText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    fontSize: isSmallScreen ? 32 : 48,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  } as TextStyle,
  comboText: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    fontSize: isSmallScreen ? 24 : 36,
    fontWeight: 'bold',
    color: '#FF69B4',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  } as TextStyle,

  // その他のUI要素
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10000,
    padding: 10,
  } as ViewStyle,
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  } as ViewStyle,
  resultsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  } as ViewStyle,
  winnerImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  } as ViewStyle,
  winnerImage: {
    width: isSmallScreen ? 60 : 80,
    height: isSmallScreen ? 60 : 80,
  } as ImageStyle,
  winnerTextContainer: {
    alignItems: 'center',
  } as ViewStyle,
  winnerText: {
    fontSize: isSmallScreen ? 24 : 32,
    fontWeight: 'bold',
    color: '#333',
  } as TextStyle,
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
  playerEmoji: {
    fontSize: 36,
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
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  playerIconContainer: {
    position: 'absolute',
    top: 2,
    left: 2,
    zIndex: 2,
  },
  playerIcon: {
    fontSize: isSmallScreen ? 20 : 24,
  },
}); 