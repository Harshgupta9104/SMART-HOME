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
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  normalizeEmail,
} from '../../utils/authValidation';
import { getFirebaseAuthErrorMessage } from '../../utils/firebaseAuthErrors';
import Icon from 'react-native-vector-icons/Feather';

type SignupScreenProps = {
  navigation: any;
};

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { createAccountWithEmail } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirmPassword);

    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmErr);

    return !emailErr && !passwordErr && !confirmErr;
  };

  const handleSignup = async () => {
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await createAccountWithEmail(normalizeEmail(email), password);

      if (result.ok) {
        setGeneralError(null);
        console.log('[SignupScreen] Account created successfully', {
          userId: result.data?.uid,
          email: result.data?.email,
        });
        // UI shows success, new user is now authenticated via AuthContext
        // Name field is not saved to Firestore in this phase
        // No global redirect here - user can navigate manually or auth gate can handle in Phase 1A-F
      } else {
        const userMessage = getFirebaseAuthErrorMessage(
          result.errorCode,
          result.errorMessage,
        );
        setGeneralError(userMessage);
      }
    } catch (error) {
      setGeneralError('An unexpected error occurred. Please try again.');
      console.error('[SignupScreen] Signup error:', error);
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Start managing your smart home
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input (Optional) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Name (optional)</Text>
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  editable={!isLoading}
                  autoCapitalize="words"
                />
              </View>
            </View>

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

            {/* Confirm Password Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Confirm password</Text>
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: confirmPasswordError ? colors.danger : colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isLoading}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.visibilityToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <Icon
                    name={showConfirmPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {confirmPasswordError && (
                <Text style={[styles.error, { color: colors.danger }]}>{confirmPasswordError}</Text>
              )}
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

            {/* Signup Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
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
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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

export default SignupScreen;
