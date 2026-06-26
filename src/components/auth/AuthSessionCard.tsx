import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../context/ThemeContext';

type AuthSessionCardProps = {
  navigation: any;
  onSignOut?: () => void;
};

/**
 * Helper: Mask email to show only first character and domain
 * Example: user@example.com → u***@example.com
 */
const maskEmail = (email?: string | null): string => {
  if (!email || !email.includes('@')) {
    return 'Current account';
  }

  const [name, domain] = email.split('@');
  const visible = name.slice(0, 1);
  return `${visible}***@${domain}`;
};

const AuthSessionCard: React.FC<AuthSessionCardProps> = ({ navigation, onSignOut }) => {
  const { user, isAuthenticated, signOut } = useAuth();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);

  const handleSignIn = () => {
    setStatusMessage(null);
    setStatusType(null);
    navigation.navigate('Login');
  };

  const handleSignUp = () => {
    setStatusMessage(null);
    setStatusType(null);
    navigation.navigate('Signup');
  };

  const handleSignOut = async () => {
    setStatusMessage(null);
    setStatusType(null);
    setIsLoading(true);

    try {
      const result = await signOut();

      if (result.ok) {
        setStatusMessage('Signed out successfully.');
        setStatusType('success');
        if (onSignOut) {
          onSignOut();
        }
      } else {
        setStatusMessage(result.errorMessage || 'Failed to sign out. Please try again.');
        setStatusType('error');
      }
    } catch {
      setStatusMessage('An unexpected error occurred. Please try again.');
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = createStyles(theme);

  if (isAuthenticated && user) {
    // Signed in state
    return (
      <View style={styles.container}>
        {/* Status Message */}
        {statusMessage && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor:
                  statusType === 'success'
                    ? `${theme.success}20`
                    : `${theme.danger}20`,
              },
            ]}
          >
            <Icon
              name={statusType === 'success' ? 'check-circle' : 'alert-circle'}
              size={16}
              color={statusType === 'success' ? theme.success : theme.danger}
              style={styles.statusIcon}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: statusType === 'success' ? theme.success : theme.danger,
                },
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        )}

        {/* Signed In Section */}
        <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardContent}>
            <Icon name="user-check" size={24} color={theme.success} style={styles.cardIcon} />
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Signed in as</Text>
              <Text style={[styles.cardValue, { color: theme.textPrimary }]}>
                {maskEmail(user.email)}
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: theme.danger, opacity: isLoading ? 0.7 : 1 }]}
          onPress={handleSignOut}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="log-out" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Not signed in state
  return (
    <View style={styles.container}>
      {/* Status Message */}
      {statusMessage && (
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor:
                statusType === 'success'
                  ? `${theme.success}20`
                  : `${theme.danger}20`,
            },
          ]}
        >
          <Icon
            name={statusType === 'success' ? 'check-circle' : 'alert-circle'}
            size={16}
            color={statusType === 'success' ? theme.success : theme.danger}
            style={styles.statusIcon}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: statusType === 'success' ? theme.success : theme.danger,
              },
            ]}
          >
            {statusMessage}
          </Text>
        </View>
      )}

      {/* Not Signed In Section */}
      <View style={[styles.cardContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardContent}>
          <Icon name="user-x" size={24} color={theme.textMuted} style={styles.cardIcon} />
          <View style={styles.cardTextContainer}>
            <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Status</Text>
            <Text style={[styles.cardValue, { color: theme.textPrimary }]}>Not signed in</Text>
          </View>
        </View>
      </View>

      {/* Auth Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.authButton, { backgroundColor: theme.primary, flex: 1 }]} onPress={handleSignIn}>
          <Icon name="log-in" size={18} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.authButtonText}>Sign In</Text>
        </TouchableOpacity>

        <View style={{ width: 12 }} />

        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: theme.primarySoft, flex: 1 }]}
          onPress={handleSignUp}
        >
          <Icon name="user-plus" size={18} color={theme.primary} style={styles.buttonIcon} />
          <Text style={[styles.authButtonText, { color: theme.primary }]}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (_theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 12,
      marginTop: 20,
      marginBottom: 20,
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    statusIcon: {
      marginRight: 8,
    },
    statusText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: 0.3,
    },
    cardContainer: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardIcon: {
      marginRight: 12,
    },
    cardTextContainer: {
      flex: 1,
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 4,
      letterSpacing: 0.3,
    },
    cardValue: {
      fontSize: 15,
      fontWeight: '600',
    },
    signOutButton: {
      flexDirection: 'row',
      height: 44,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonIcon: {
      marginRight: 8,
    },
    signOutButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 0,
    },
    authButton: {
      flexDirection: 'row',
      height: 44,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    authButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default AuthSessionCard;
