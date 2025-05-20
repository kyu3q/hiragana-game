import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  historyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  historyItem: {
    fontSize: 18,
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
    padding: 10,
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  choiceText: {
    fontSize: 16,
    color: '#1976d2',
  },
}); 