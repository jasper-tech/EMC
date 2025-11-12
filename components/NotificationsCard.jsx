import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";
import ThemedView from "../components/ThemedView";
import ThemedText from "../components/ThemedText";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const NotificationsCard = ({ maxItems = 5 }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    // Subscribe to notifications collection
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      orderBy("timestamp", "desc"),
      limit(50) // Fetch more than we need for show all
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(notificationsList);
        setLoading(false);
      },
      (error) => {
        if (error.code !== "permission-denied") {
          console.error("Error fetching notifications:", error);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const isReadByCurrentUser = (notification) => {
    if (!currentUserId || !notification.readBy) return false;
    return notification.readBy.includes(currentUserId);
  };

  const markAsRead = async (notificationId) => {
    if (!currentUserId) return;

    try {
      setUpdatingIds((prev) => new Set(prev).add(notificationId));
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, {
        readBy: arrayUnion(currentUserId),
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    } finally {
      setUpdatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;

    try {
      const unreadNotifications = notifications.filter(
        (n) => !isReadByCurrentUser(n)
      );

      // Update notifications one by one (batch doesn't work well with arrayUnion)
      const updatePromises = unreadNotifications.map((notification) => {
        const notificationRef = doc(db, "notifications", notification.id);
        return updateDoc(notificationRef, {
          readBy: arrayUnion(currentUserId),
        });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "user_created":
        return { name: "person-add", color: Colors.greenAccent };
      case "user_updated":
        return { name: "person", color: Colors.blueAccent };
      case "payment_received":
        return { name: "payment", color: Colors.greenAccent };
      case "payment_overdue":
        return { name: "warning", color: Colors.redAccent };
      case "event_created":
        return { name: "event", color: Colors.purpleAccent };
      case "announcement":
        return { name: "campaign", color: Colors.yellowAccent };
      default:
        return { name: "notifications", color: Colors.blueAccent };
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }) => {
    const iconInfo = getNotificationIcon(item.type);
    const isUpdating = updatingIds.has(item.id);
    const isRead = isReadByCurrentUser(item);
    const readCount = item.readBy ? item.readBy.length : 0;

    return (
      <View style={styles.notificationItem}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: iconInfo.color + "20" },
          ]}
        >
          <MaterialIcons
            name={iconInfo.name}
            size={24}
            color={iconInfo.color}
          />
        </View>

        <View style={styles.notificationContent}>
          <ThemedText style={styles.notificationTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.notificationMessage}>
            {item.message}
          </ThemedText>
          <View style={styles.notificationFooter}>
            <View style={styles.footerLeft}>
              <ThemedText style={styles.notificationTime}>
                {formatTimestamp(item.timestamp)}
              </ThemedText>
              {/* {readCount > 0 && (
                <View style={styles.readCountContainer}>
                  <MaterialIcons
                    name="visibility"
                    size={12}
                    color={Colors.blueAccent}
                  />
                  <ThemedText style={styles.readCountText}>
                    {readCount}
                  </ThemedText>
                </View>
              )} */}
            </View>
            {!isRead && (
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={() => markAsRead(item.id)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={Colors.blueAccent} />
                ) : (
                  <ThemedText style={styles.markReadText}>
                    Mark as read
                  </ThemedText>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!isRead && <View style={styles.unreadBadge} />}
      </View>
    );
  };

  const MAX_VISIBLE_ITEMS = 4;
  const ITEM_HEIGHT = 72;

  const displayedNotifications = showAll
    ? notifications
    : notifications.slice(0, maxItems);

  const unreadCount = notifications.filter(
    (n) => !isReadByCurrentUser(n)
  ).length;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <MaterialIcons
            name="notifications"
            size={24}
            color={Colors.blueAccent}
          />
          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.blueAccent} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons
            name="notifications"
            size={24}
            color={Colors.blueAccent}
          />
          <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={markAllAsRead}
              >
                <MaterialIcons
                  name="done-all"
                  size={20}
                  color={Colors.blueAccent}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="notifications-none" size={48} color="#ccc" />
          <ThemedText style={styles.emptyText}>No notifications yet</ThemedText>
        </View>
      ) : (
        <>
          <View
            style={{
              maxHeight: MAX_VISIBLE_ITEMS * ITEM_HEIGHT,
              marginBottom: 8,
            }}
          >
            <FlatList
              data={displayedNotifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id}
              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.listContent}
            />
          </View>

          {notifications.length > maxItems && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAll(!showAll)}
            >
              <ThemedText style={styles.showMoreText}>
                {showAll ? "Show Less" : `View All (${notifications.length})`}
              </ThemedText>
              <MaterialIcons
                name={showAll ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={20}
                color={Colors.blueAccent}
              />
            </TouchableOpacity>
          )}
        </>
      )}
    </ThemedView>
  );
};

export default NotificationsCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: Colors.redAccent,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  markAllButton: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
  },
  listContent: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTime: {
    fontSize: 11,
    opacity: 0.5,
  },
  readCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.blueAccent + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  readCountText: {
    fontSize: 10,
    color: Colors.blueAccent,
    fontWeight: "600",
  },
  markReadButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 11,
    color: Colors.blueAccent,
    fontWeight: "600",
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.blueAccent,
    marginTop: 6,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    color: Colors.blueAccent,
    fontWeight: "600",
  },
});
