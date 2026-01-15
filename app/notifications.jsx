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
import FooterNav from "../components/FooterNav";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    // Subscribe to notifications collection
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, orderBy("timestamp", "desc"));

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

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !isRead && styles.unreadNotification]}
        onPress={() => !isRead && markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: iconInfo.color + "20" },
          ]}
        >
          <MaterialIcons
            name={iconInfo.name}
            size={28}
            color={iconInfo.color}
          />
        </View>

        <View style={styles.notificationContent}>
          <ThemedText style={styles.notificationTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.notificationMessage}>
            {item.message}
          </ThemedText>
          <View style={styles.notificationFooter}>
            <ThemedText style={styles.notificationTime}>
              {formatTimestamp(item.timestamp)}
            </ThemedText>
            {!isRead && (
              <View style={styles.unreadIndicator}>
                <MaterialIcons
                  name="fiber-manual-record"
                  size={12}
                  color={Colors.blueAccent}
                />
              </View>
            )}
          </View>
        </View>

        {isUpdating && (
          <ActivityIndicator size="small" color={Colors.blueAccent} />
        )}
      </TouchableOpacity>
    );
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !isReadByCurrentUser(notification);
    if (filter === "read") return isReadByCurrentUser(notification);
    return true;
  });

  const unreadCount = notifications.filter(
    (n) => !isReadByCurrentUser(n)
  ).length;

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.blueAccent} />
          <ThemedText style={styles.loadingText}>
            Loading notifications...
          </ThemedText>
        </View>
        <FooterNav />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText style={styles.headerTitle}>All Notifications</ThemedText>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
            >
              <MaterialIcons
                name="done-all"
                size={22}
                color={Colors.blueAccent}
              />
              <ThemedText style={styles.markAllText}>Mark all read</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setFilter("all")}
          >
            <ThemedText
              style={[
                styles.filterText,
                filter === "all" && styles.filterTextActive,
              ]}
            >
              All ({notifications.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "unread" && styles.filterButtonActive,
            ]}
            onPress={() => setFilter("unread")}
          >
            <ThemedText
              style={[
                styles.filterText,
                filter === "unread" && styles.filterTextActive,
              ]}
            >
              Unread ({unreadCount})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === "read" && styles.filterButtonActive,
            ]}
            onPress={() => setFilter("read")}
          >
            <ThemedText
              style={[
                styles.filterText,
                filter === "read" && styles.filterTextActive,
              ]}
            >
              Read ({notifications.length - unreadCount})
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="notifications-none" size={64} color="#ccc" />
          <ThemedText style={styles.emptyText}>
            {filter === "all"
              ? "No notifications yet"
              : filter === "unread"
              ? "No unread notifications"
              : "No read notifications"}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        />
      )}

      <FooterNav />
    </ThemedView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.blueAccent + "15",
  },
  markAllText: {
    fontSize: 14,
    color: Colors.blueAccent,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: Colors.blueAccent,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.7,
  },
  filterTextActive: {
    color: "#FFFFFF",
    opacity: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: 16,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  unreadNotification: {
    backgroundColor: Colors.blueAccent + "08",
    borderLeftWidth: 3,
    borderLeftColor: Colors.blueAccent,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationTime: {
    fontSize: 12,
    opacity: 0.5,
  },
  unreadIndicator: {
    marginLeft: 8,
  },
});
