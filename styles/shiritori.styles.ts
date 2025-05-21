import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');
// iPadの画面サイズを考慮して、画面の向きに関係なく判定
const isSmallScreen = Math.min(width, height) <  768; // 768ptを基準に

export const styles = StyleSheet.create({
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
    borderWidth: 2,
    borderColor: '#4caf50',
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