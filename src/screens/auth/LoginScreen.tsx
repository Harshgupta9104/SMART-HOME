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
import { validateEmail, validatePassword, normalizeEmail } from '../../utils/authValidation';
import { getFirebaseAuthErrorMessage } from '../../utils/firebaseAuthErrors';
import Icon from 'react-native-vector-icons/Feather';

type LoginScreenProps = {
  navigation: any;
};

type StatusType = 'success' | 'error';

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<StatusType | null>(null);

  const validateForm = (): boolean => {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    return !emailErr && !passwordErr;
  };

  const handleLogin = async () => {
    setStatusMessage(null);
    setStatusType(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInWithEmail(normalizeEmail(email), password);

      if (result.ok) {
        setStatusMessage('Signed in successfully.');
        setStatusType('success');
      } else {
        const userMessage = getFirebaseAuthErrorMessage(result.errorCode);
        setStatusMessage(userMessage);
        setStatusType('error');
      }
    } catch {
      setStatusMessage('An unexpected error occurred. Please try again.');
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const colors = theme.theme;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Smart Home</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Control your home securely
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

            {/* Password Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: passwordError ? colors.danger : colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.visibilityToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Icon
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {passwordError && <Text style={[styles.error, { color: colors.danger }]}>{passwordError}</Text>}
            </View>

            {/* General Error */}
            {statusMessage && (
              <Text
                style={[
                  styles.statusMessage,
                  {
                    color: statusType === 'success' ? colors.success : colors.danger,
                  },
                ]}
              >
                {statusMessage}
              </Text>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={isLoading}
              style={styles.linkContainer}
            >
              <Text style={[styles.link, { color: colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={isLoading}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Create one</Text>
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
  visibilityToggle: {
    padding: 8,
    marginRight: -8,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  statusMessage: {
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
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  linkContainer: {
    alignItems: 'center',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default LoginScreen;
