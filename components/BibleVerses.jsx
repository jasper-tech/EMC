import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import ThemedView from "./ThemedView";
import ThemedText from "./ThemedText";
import { Colors } from "../constants/Colors";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

// Local Bible verses as fallback
const LOCAL_BIBLE_VERSES = [
  {
    verse:
      "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    reference: "John 3:16",
  },
  {
    verse: "I can do all this through him who gives me strength.",
    reference: "Philippians 4:13",
  },
  {
    verse:
      "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    reference: "Proverbs 3:5-6",
  },
  {
    verse: "The Lord is my shepherd, I lack nothing.",
    reference: "Psalm 23:1",
  },
  {
    verse:
      "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.",
    reference: "Philippians 4:6",
  },
  {
    verse:
      "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    reference: "Joshua 1:9",
  },
  {
    verse:
      "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    reference: "Isaiah 40:31",
  },
  {
    verse:
      "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    reference: "Romans 8:28",
  },
  {
    verse: "Cast all your anxiety on him because he cares for you.",
    reference: "1 Peter 5:7",
  },
  {
    verse:
      "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.",
    reference: "Jeremiah 29:11",
  },
  {
    verse:
      "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?",
    reference: "Psalm 27:1",
  },
  {
    verse:
      "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.",
    reference: "Galatians 5:22-23",
  },
  {
    verse:
      "Jesus said to her, 'I am the resurrection and the life. The one who believes in me will live, even though they die.'",
    reference: "John 11:25",
  },
  {
    verse: "Let everything that has breath praise the Lord. Praise the Lord.",
    reference: "Psalm 150:6",
  },
  {
    verse:
      "But seek first his kingdom and his righteousness, and all these things will be given to you as well.",
    reference: "Matthew 6:33",
  },
  {
    verse:
      "Come to me, all you who are weary and burdened, and I will give you rest.",
    reference: "Matthew 11:28",
  },
  {
    verse:
      "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
    reference: "Psalm 34:18",
  },
  {
    verse: "Your word is a lamp for my feet, a light on my path.",
    reference: "Psalm 119:105",
  },
  {
    verse:
      "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!",
    reference: "2 Corinthians 5:17",
  },
  {
    verse: "But as for me and my household, we will serve the Lord.",
    reference: "Joshua 24:15",
  },
];

const BibleVerses = () => {
  const [verse, setVerse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [usedIndices, setUsedIndices] = useState([]);

  // Function to get a random verse that hasn't been used recently
  const getRandomVerse = () => {
    if (LOCAL_BIBLE_VERSES.length === 0) return null;

    // If all verses have been used, reset the used indices
    if (usedIndices.length >= LOCAL_BIBLE_VERSES.length) {
      setUsedIndices([]);
    }

    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * LOCAL_BIBLE_VERSES.length);
    } while (usedIndices.includes(randomIndex));

    setUsedIndices((prev) => [...prev, randomIndex]);
    setCurrentIndex(randomIndex);
    return LOCAL_BIBLE_VERSES[randomIndex];
  };

  // Function to fetch verse from API
  const fetchBibleVerse = async () => {
    try {
      setLoading(true);
      setError(false);

      // Try to fetch from online API first
      const response = await fetch(
        "https://beta.ourmanna.com/api/v1/get/?format=json&order=random"
      );

      if (response.ok) {
        const data = await response.json();
        if (data.verse && data.verse.details) {
          setVerse({
            verse: data.verse.details.text,
            reference: data.verse.details.reference,
          });
          return true;
        } else {
          throw new Error("Invalid API response");
        }
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      console.log("Using local Bible verses:", error.message);
      setError(true);
      const localVerse = getRandomVerse();
      if (localVerse) {
        setVerse(localVerse);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Function to cycle to the next verse
  const nextVerse = () => {
    const success = fetchBibleVerse();
    if (!success) {
      // If API fails, use local verses
      const localVerse = getRandomVerse();
      if (localVerse) {
        setVerse(localVerse);
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBibleVerse();
  }, []);

  // Set up interval for cycling verses every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      nextVerse();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  // Also set up interval to refresh from API every hour
  useEffect(() => {
    const hourlyInterval = setInterval(fetchBibleVerse, 3600000); // 1 hour
    return () => clearInterval(hourlyInterval);
  }, []);

  if (loading && !verse) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="small" color={Colors.blueAccent} />
        <ThemedText style={styles.loadingText}>Loading verse...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Daily Bible Verse</ThemedText>
      </ThemedView>

      <ThemedView style={styles.verseContainer}>
        {verse && (
          <>
            <ThemedText style={styles.verseText}>"{verse.verse}"</ThemedText>
            <ThemedText style={styles.reference}>
              — {verse.reference}
            </ThemedText>
          </>
        )}

        {error && (
          <ThemedText style={styles.sourceNote}>
            (Cycling through local verses every 15 seconds)
          </ThemedText>
        )}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
    padding: isWeb ? 24 : 20,
    borderRadius: 16,
    marginVertical: 20,
    shadowColor: "#000",
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
    alignItems: "center",
  },
  title: {
    fontSize: isWeb ? 22 : 20,
    fontWeight: "bold",
    // color: Colors.blueAccent,
  },
  verseContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  verseText: {
    fontSize: isWeb ? 18 : 16,
    lineHeight: isWeb ? 28 : 24,
    textAlign: "center",
    marginBottom: 12,
    fontStyle: "italic",
  },
  reference: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "600",
    textAlign: "center",
  },
  sourceNote: {
    fontSize: isWeb ? 14 : 12,
    color: Colors.gray,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  timerNote: {
    fontSize: isWeb ? 14 : 12,
    color: Colors.blueAccent,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  timerContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  timerTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  timerProgress: {
    height: "100%",
    width: "100%",
    backgroundColor: Colors.blueAccent,
    borderRadius: 2,
  },
  timerText: {
    fontSize: isWeb ? 12 : 10,
    color: Colors.gray,
    fontWeight: "500",
  },
});

export default BibleVerses;
