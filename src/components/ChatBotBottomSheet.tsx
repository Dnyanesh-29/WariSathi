import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './CustomText';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { getGeminiResponse } from '../services/GeminiService';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
}

interface Props {
  bottomSheetRef: any;
}

export function ChatBotBottomSheet({ bottomSheetRef }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    text: 'नमस्कार! मी तुमचा वारीसाठी गाईड आहे. तुम्हाला काही मदत हवी आहे का? (Hello! I am your WariSathi guide. Do you need any help?)',
    isBot: true
  }]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', (e) => {
    console.warn('Voice recognition error:', e.message);
    setIsListening(false);
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (e.results && e.results.length > 0) {
      setInputText(e.results[0].transcript);
    }
  });

  const toggleListening = async () => {
    if (isListening) {
      await ExpoSpeechRecognitionModule.stop();
    } else {
      setInputText('');
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        console.warn('Microphone permission denied');
        return;
      }
      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'mr-IN',
          interimResults: true,
          continuous: false,
        });
      } catch (e) {
        console.warn('Could not start voice recognition', e);
      }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText('');
    Speech.stop(); // Stop any currently speaking audio

    const userMsg: ChatMessage = { id: Date.now().toString(), text: userText, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const rawReply = await getGeminiResponse(userText);
    // Strip markdown bold and italic asterisks
    const reply = rawReply.replace(/\*\*/g, '').replace(/\*/g, '');
    
    const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), text: reply, isBot: true };
    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);

    // Speak the response using expo-speech
    // language can be set to mr-IN or en-IN
    Speech.speak(reply, { language: 'mr-IN', rate: 0.9 });
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['50%', '85%']}
      enablePanDownToClose
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.indicator}
    >
      <View style={styles.header}>
        <Ionicons name="chatbubbles" size={24} color={Colors.primary} />
        <Text style={styles.headerTitle}>AI Guide / मार्गदर्शक</Text>
      </View>

      <BottomSheetScrollView
        style={styles.chatContainer}
        ref={scrollViewRef as any}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[styles.messageBubble, msg.isBot ? styles.botBubble : styles.userBubble]}>
            <Text style={[styles.messageText, msg.isBot ? styles.botText : styles.userText]}>
              {msg.text}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageBubble, styles.botBubble, { alignSelf: 'flex-start' }]}>
            <ActivityIndicator color={Colors.primary} size="small" />
          </View>
        )}
      </BottomSheetScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask a question..."
          placeholderTextColor={Colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.micBtn, isListening && styles.micBtnActive]}
          onPress={toggleListening}
        >
          <Ionicons name={isListening ? "mic" : "mic-outline"} size={24} color={isListening ? "#fff" : Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: {
    backgroundColor: Colors.border,
    width: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
  },
  botText: {
    color: Colors.textPrimary,
  },
  userText: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    backgroundColor: Colors.surface,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.textPrimary,
    fontSize: 15,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  micBtnActive: {
    backgroundColor: Colors.danger,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
