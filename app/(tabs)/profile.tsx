import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { useAuth } from '@/context/auth';
import { MessageCircle, Users, Clock, Camera } from 'lucide-react-native';
import { createProfile, getProfile, updateProfile } from '@/src/services/profileService';
import { useTheme } from '@/context/theme';
import { handleError, getErrorMessage } from '@/lib/errorHandler';
import { ERROR_MESSAGES } from '@/lib/constants';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status_message: string | null;
  created_at: string;
  last_seen: string;
}

const DICEBEAR_STYLES = ['avataaars', 'micah', 'bottts', 'gridy', 'identicon', 'adventurer'];

export default function ProfileScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [promptField, setPromptField] = useState<keyof Profile | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptTitle, setPromptTitle] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      if (!session?.user) {
        throw new Error('No authenticated user');        
      }

      const { data } = await getProfile(session.user.id);

      if (!data) {
        // Create default profile if none exists
        const defaultProfile = {
          id: session.user.id,
          username: `user_${session.user.id.slice(0, 8)}`,
          display_name: 'New User',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
        };

        const { data: newProfile, error: createError } = await createProfile(defaultProfile);
        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setFetchError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  },[session?.user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile,session?.user]);

  const handleProfileUpdate = async (updates: Partial<Profile>) => {
    try {
      setLoading(true);
      if (!session?.user?.id || !profile) return;

      const { error } = await updateProfile(session.user.id, updates);
      if (error) throw error;

      setProfile({ ...profile, ...updates });
    } catch (error) {
      const { message } = handleError(error);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const openPrompt = (field: keyof Profile, title: string, placeholder: string) => {
    setPromptField(field);
    setPromptTitle(title);
    setPromptValue(profile?.[field] || placeholder);
    setIsPromptVisible(true);
  };

  const handlePromptSubmit = () => {
    if (promptField) {
      handleProfileUpdate({ [promptField]: promptValue });
    }
    setIsPromptVisible(false);
  };

  const fetchAvatars = async () => {
    const seeds = Array.from({ length: 5 }, () => Math.random().toString(36).substring(7));
    const avatars = DICEBEAR_STYLES.flatMap(style =>
      seeds.map(seed => `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`)
    );
    setAvatarOptions(avatars);
  };

  const handleAvatarClick = async () => {    
    await fetchAvatars();
    setShowAvatarModal(true);
  };

  const handleAvatarSelect = async (avatar: string) => {
    try {
      setSelectedAvatar(avatar);
      setShowAvatarModal(false);
      await handleProfileUpdate({ avatar_url: avatar });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      Alert.alert('Error', errorMessage);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{fetchError}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { 
          backgroundColor: colors.surface,
          borderBottomColor: colors.border
        }]}>
          <TouchableOpacity onPress={handleAvatarClick} style={styles.avatarContainer}>
            <Image
              source={{
                uri: selectedAvatar || profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'
              }}
              style={styles.avatar}
            />
            <View style={styles.cameraButton}>
              <Camera size={20} color="#fff" />
            </View>
          </TouchableOpacity>        
          <TouchableOpacity onPress={() => openPrompt('display_name', 'Update Display Name', 'Display Name')}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {profile?.display_name || profile?.username}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openPrompt('username', 'Update Username', 'Username')}>
            <Text style={[styles.username, { color: colors.gray }]}>@{profile?.username}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openPrompt('status_message', 'Update Status Message', 'Status Message')}>
            <Text style={[styles.status, { color: colors.gray }]}>
              {profile?.status_message || 'Tap to set a status'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.joinedDate, { color: colors.gray }]}>
            Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
          </Text>
        </View>

        <View style={[styles.stats, { borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <MessageCircle size={24} color={colors.gray} />
            <Text style={[styles.statNumber, { color: colors.text }]}>128</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Messages</Text>
          </View>
          <View style={styles.statItem}>
            <Users size={24} color={colors.gray} />
            <Text style={[styles.statNumber, { color: colors.text }]}>12</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Rooms</Text>
          </View>
          <View style={styles.statItem}>
            <Clock size={24} color={colors.gray} />
            <Text style={[styles.statNumber, { color: colors.text }]}>45h</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Time Spent</Text>
          </View>
        </View>

        {/* Avatar Selection Modal */}
        <Modal visible={showAvatarModal} onRequestClose={() => setShowAvatarModal(false)}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select an Avatar</Text>
            <ScrollView contentContainerStyle={styles.avatarOptions}>
              {avatarOptions.map((avatar, index) => (
                <TouchableOpacity key={index} onPress={() => handleAvatarSelect(avatar)}>
                  <Image source={{ uri: avatar }} style={styles.avatarOption} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowAvatarModal(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>

      {/* Custom Prompt Modal */}
      <Modal visible={isPromptVisible} transparent={true} animationType="fade">
        <View style={styles.promptOverlay}>
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>{promptTitle}</Text>
            <TextInput
              style={styles.promptInput}
              value={promptValue}
              onChangeText={setPromptValue}
              placeholder="Enter value"
            />
            <View style={styles.promptButtons}>
              <TouchableOpacity onPress={() => setIsPromptVisible(false)} style={styles.promptButton}>
                <Text style={styles.promptButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePromptSubmit} style={styles.promptButton}>
                <Text style={styles.promptButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
    justifyContent: 'center', // Center the avatar vertically
    alignItems: 'center',    // Center the avatar horizontally
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: '#f5f5f5', // Add fallback background color
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 16,
    marginTop: 4,
  },
  status: {
    fontSize: 16,
    marginTop: 8,
  },
  joinedDate: {
    fontSize: 14,
    marginTop: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderBottomWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  avatarOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  avatarOption: {
    width: 80,
    height: 80,
    margin: 10,
    borderRadius: 40,
  },
  modalButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  promptOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  promptContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  promptInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  promptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  promptButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: '#007BFF',
    borderRadius: 5,
    alignItems: 'center',
  },
  promptButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
