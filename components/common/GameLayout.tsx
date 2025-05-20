import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type GameLayoutProps = {
  children: React.ReactNode;
  onRetry: () => void;
  onSwitchGame: () => void;
};

export default function GameLayout({ children, onRetry, onSwitchGame }: GameLayoutProps) {
  return (
    <View style={styles.container}>
      {children}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>リトライ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onSwitchGame}>
          <Text style={styles.buttonText}>ゲーム切替</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 