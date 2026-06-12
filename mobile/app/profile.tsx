import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as endpoints from '../api/endpoints';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  const isDirty = name.trim() !== (user?.name ?? '') || email.trim() !== (user?.email ?? '');

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Elimina account',
      'Questa azione è irreversibile. Tutti i tuoi post e commenti verranno eliminati.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await endpoints.deleteMe();
              await logout();
              router.replace('/login');
            } catch {
              Alert.alert('Errore', "Impossibile eliminare l'account. Riprova.");
            }
          },
        },
      ],
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) { setError('Il nome non può essere vuoto'); return; }
    if (!email.trim()) { setError("L'email non può essere vuota"); return; }
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const fields: { name?: string; email?: string } = {};
      if (name.trim() !== user?.name) fields.name = name.trim();
      if (email.trim() !== user?.email) fields.email = email.trim();

      const { user: updated } = await endpoints.updateMe(fields);
      setUser(updated);
      setSuccess(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg ?? 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Avatar grande */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {(user?.name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.roleBadge, user?.role === 'admin' && styles.roleBadgeAdmin]}>
            <Text style={[styles.roleText, user?.role === 'admin' && styles.roleTextAdmin]}>
              {user?.role ?? '—'}
            </Text>
          </View>
        </View>

        {/* Campos editables */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informazioni personali</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(t) => { setName(t); setError(''); setSuccess(false); }}
              placeholder="Il tuo nome"
              placeholderTextColor="#6b6f85"
              autoCapitalize="words"
              editable={!saving}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); setSuccess(false); }}
              placeholder="la-tua@email.com"
              placeholderTextColor="#6b6f85"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!saving}
            />
          </View>

          {/* Campo non editabile: ID */}
          <View style={styles.field}>
            <Text style={styles.label}>ID account</Text>
            <View style={styles.readOnly}>
              <Text style={styles.readOnlyText}>{user?.id ?? '—'}</Text>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.successMsg}>Profilo aggiornato con successo.</Text> : null}

        <Pressable
          style={[styles.saveBtn, (!isDirty || saving) && styles.saveBtnDisabled]}
          onPress={() => void handleSave()}
          disabled={!isDirty || saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#17182B" />
            : <Text style={styles.saveBtnText}>Salva modifiche</Text>}
        </Pressable>

        <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteBtnText}>Elimina account</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#17182B',
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },

  // Avatar
  avatarWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2e3048',
    borderWidth: 2,
    borderColor: '#C9B99A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: '#C9B99A',
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#252740',
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  roleBadgeAdmin: {
    backgroundColor: '#2a2518',
    borderColor: '#C9B99A44',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b6f85',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roleTextAdmin: {
    color: '#C9B99A',
  },

  // Card
  card: {
    backgroundColor: '#1e2038',
    borderRadius: 14,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2e3048',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a0a3b1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#a0a3b1',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#17182B',
    borderWidth: 1,
    borderColor: '#2e3048',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#e8e8f0',
  },
  readOnly: {
    backgroundColor: '#252740',
    borderWidth: 1,
    borderColor: '#2e3048',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 13,
    color: '#6b6f85',
    fontFamily: 'monospace',
  },

  // Feedback
  error: {
    fontSize: 13,
    color: '#fc8181',
    textAlign: 'center',
  },
  successMsg: {
    fontSize: 13,
    color: '#68d391',
    textAlign: 'center',
  },

  // Botón guardar
  saveBtn: {
    backgroundColor: '#C9B99A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: '#17182B',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: '#5c2a2a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#2d1a1a',
  },
  deleteBtnText: {
    color: '#fc8181',
    fontSize: 15,
    fontWeight: '600',
  },
});
