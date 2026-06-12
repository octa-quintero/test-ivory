import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import ParticlesBackground from '../components/ParticlesBackground';
import { useAuthStore } from '../stores/authStore';

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <View style={eye.outer}>
      <View style={eye.inner} />
      {!visible && <View style={eye.slash} />}
    </View>
  );
}

const eye = StyleSheet.create({
  outer: {
    width: 18,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6b6f85',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#6b6f85',
  },
  slash: {
    position: 'absolute',
    width: 22,
    height: 1.5,
    backgroundColor: '#6b6f85',
    transform: [{ rotate: '-30deg' }],
  },
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const handleLogin = async (): Promise<void> => {
    if (!email.trim()) {
      setEmailError("Inserisci l'email");
      return;
    }
    setEmailError('');
    // login mock: la password è opzionale — se inserita, viene validata
    await login(email.trim(), password.trim() || undefined);
    if (useAuthStore.getState().token) {
      router.replace('/feed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ParticlesBackground />

      <View style={styles.inner}>

        {/* Logo area */}
        <View style={styles.logoArea}>
          <Image
            source={require('../assets/images/logo-vector.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.divider} />
          <Text style={styles.tagline}>Il tuo feed. La tua community.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accedi</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Indirizzo email</Text>
            <TextInput
              style={styles.input}
              placeholder="ada@ivory.test"
              placeholderTextColor="#6b6f85"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isLoading}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password (opzionale)</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="#6b6f85"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
              >
                <EyeIcon visible={showPassword} />
              </Pressable>
            </View>
          </View>

          {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#17182B" />
            ) : (
              <Text style={styles.buttonText}>Entra</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>Ivory © 2026 · Tutti i diritti riservati</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17182B',
  },

  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },

  // Logo area
  logoArea: {
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: '65%',
    height: 70,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: '#C9B99A',
    opacity: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#a0a3b1',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Card
  card: {
    backgroundColor: '#1e2038',
    borderRadius: 16,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },

  // Fields
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#a0a3b1',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2e3048',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#fff',
    backgroundColor: '#17182B',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2e3048',
    borderRadius: 10,
    backgroundColor: '#17182B',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#fff',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  error: {
    color: '#fc8181',
    fontSize: 13,
  },

  button: {
    backgroundColor: '#C9B99A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#17182B',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#3a3d52',
  },
});
