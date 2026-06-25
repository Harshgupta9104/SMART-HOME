import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, normalizeEmail } from '../../utils/authValidation';
import Icon from 'react-native-vector-icons/Feather';

type ForgotPasswordScreenProps = {
  navigation: any;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    return !emailErr;
  };

  const handleSendReset = async () => {
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Phase 1A-D: UI shell only - no actual Firebase call yet
    // In Phase 1A-E, this will call sendPasswordReset(email)
    console.log('[ForgotPasswordScreen] Password reset validation passed - reset action deferred to Phase 1A-E', {
      email: normalizeEmail(email),
    });

    // Simulate a brief loading state to show the UI works
    setTimeout(() => {
      setIsLoading(false);
      setGeneralError('📋 Phase 1A-D: Password reset UI validated. Reset action deferred to Phase 1A-E.');
    }, 800);
  };

  const colors = theme.theme;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Reset password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email to receive reset instructions
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: emailError ? colors.danger : colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {emailError && <Text style={[styles.error, { color: colors.danger }]}>{emailError}</Text>}
            </View>

            {/* General Error */}
            {generalError && (
              <Text
                style={[
                  styles.generalError,
                  { color: generalError.includes('validated') ? colors.success : colors.danger },
                ]}
              >
                {generalError}
              </Text>
            )}

            {/* Send Reset Link Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleSendReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
              style={styles.backLinkContainer}
            >
              <Icon name="arrow-left" size={20} color={colors.primary} />
              <Text style={[styles.backLink, { color: colors.primary }]}>Back to login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  form: {
    marginBottom: 32,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  generalError: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    letterSpacing: 0.3,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
  },
  backLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLink: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});

export default ForgotPasswordScreen;
