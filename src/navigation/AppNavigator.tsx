import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme, lightNavTheme, darkNavTheme } from '../theme/theme';

import HomeScreen from '../screens/HomeScreen';
import AddWordScreen from '../screens/AddWordScreen';
import StudyScreen from '../screens/StudyScreen';
import StatsScreen from '../screens/StatsScreen';
import WordListScreen from '../screens/WordListScreen';
import WordDetailScreen from '../screens/WordDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WordbankPickerScreen from '../screens/WordbankPickerScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import DictionaryBrowseScreen from '../screens/DictionaryBrowseScreen';
import DictionaryWordDetailScreen from '../screens/DictionaryWordDetailScreen';
import type { RootStackParamList, MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// 统一的 Stack header 样式：所有栈屏一律显示标题栏（含返回按钮），Web 与移动端一致
const stackHeaderOptions = (title: string, colors: { primary: string; surface: string; onSurface: string }) => ({
  headerShown: true as boolean,
  title,
  headerStyle: {
    backgroundColor: colors.primary,
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold' as const,
  },
  headerBackTitleVisible: false,
});

// 主标签导航（4 个 Tab：学习 / 生词本 / 词库 / 我的）
// 图标名需精确匹配 MaterialIcons 的字面量联合类型，用查找表保证类型安全
const TAB_ICONS: Record<
  keyof MainTabParamList,
  React.ComponentProps<typeof MaterialIcons>['name']
> = {
  Home: 'home',
  Words: 'book',
  Dictionary: 'library-books',
  Profile: 'account-circle',
};

function MainTabs() {
  const { colors, dark } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tertiary,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          paddingBottom: 4,
        },
        tabBarStyle: {
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '学习' }} />
      <Tab.Screen name="Words" component={WordListScreen} options={{ tabBarLabel: '生词本' }} />
      <Tab.Screen name="Dictionary" component={DictionaryScreen} options={{ tabBarLabel: '词库' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '我的' }} />
    </Tab.Navigator>
  );
}

// 主导航栈
export default function AppNavigator() {
  const { colors, dark } = useAppTheme();
  const header = (title: string) => stackHeaderOptions(title, colors);

  return (
    <NavigationContainer
      theme={dark ? darkNavTheme : lightNavTheme}
      documentTitle={{ formatter: () => '考研英语生词本' }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddWord"
          component={AddWordScreen}
          options={header('添加生词')}
        />
        <Stack.Screen
          name="WordbankPicker"
          component={WordbankPickerScreen}
          options={header('从词库选词')}
        />
        <Stack.Screen
          name="Study"
          component={StudyScreen}
          options={header('开始学习')}
        />
        <Stack.Screen
          name="WordDetail"
          component={WordDetailScreen}
          options={header('单词详情')}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={header('学习统计')}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={header('设置')}
        />
        <Stack.Screen
          name="DictionaryBrowse"
          component={DictionaryBrowseScreen}
          options={header('词库')}
        />
        <Stack.Screen
          name="DictionaryWordDetail"
          component={DictionaryWordDetailScreen}
          options={header('单词详情')}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
