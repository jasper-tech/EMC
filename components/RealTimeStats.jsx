import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../firebase";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/Colors";

const useRealTimeStats = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    duesCollected: 0,
    outstandingDues: 0,
    transactionsCount: 0,
    growthRate: 0,
    executiveMembers: 0,
    regularMembers: 0,
    totalExpectedDues: 0,
    previousMonthDues: 0,
    previousMonthMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousMonthYear =
      currentMonth === 1 ? currentYear - 1 : currentYear;

    let membersData = [];
    let transactionsData = [];
    let financesData = [];
    let allocationsData = [];

    // Subscribe to members collection
    const membersUnsubscribe = onSnapshot(
      query(collection(db, "members")),
      (snapshot) => {
        membersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const totalMembers = snapshot.size;
        const executiveMembers = membersData.filter(
          (member) => member.isExecutive
        ).length;
        const regularMembers = totalMembers - executiveMembers;
        const previousMonthMembers = totalMembers; // Simplified - you might want actual historical data

        setStats((prev) => ({
          ...prev,
          totalMembers,
          executiveMembers,
          regularMembers,
          previousMonthMembers,
        }));
        calculateAllStats(
          membersData,
          transactionsData,
          financesData,
          allocationsData
        );
      }
    );

    // Subscribe to transactions
    const transactionsUnsubscribe = onSnapshot(
      query(collection(db, "transactions")),
      (snapshot) => {
        transactionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStats((prev) => ({ ...prev, transactionsCount: snapshot.size }));
        calculateAllStats(
          membersData,
          transactionsData,
          financesData,
          allocationsData
        );
      }
    );

    // Subscribe to finances for dues collected
    const financesUnsubscribe = onSnapshot(
      query(collection(db, "finances"), where("type", "==", "dues")),
      (snapshot) => {
        financesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        calculateAllStats(
          membersData,
          transactionsData,
          financesData,
          allocationsData
        );
      }
    );

    // Subscribe to dues allocations
    const allocationsUnsubscribe = onSnapshot(
      query(
        collection(db, "duesAllocations"),
        where("year", "==", currentYear)
      ),
      (snapshot) => {
        allocationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        calculateAllStats(
          membersData,
          transactionsData,
          financesData,
          allocationsData
        );
      }
    );

    const calculateAllStats = (
      members,
      transactions,
      finances,
      allocations
    ) => {
      if (members.length === 0) return;

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // Calculate dues collected (current year)
      const currentYearDues = finances
        .filter((finance) => {
          const financeDate = finance.timestamp?.toDate();
          return financeDate && financeDate.getFullYear() === currentYear;
        })
        .reduce((total, finance) => total + (finance.amount || 0), 0);

      // Calculate previous month dues for trend
      const previousMonthDues = finances
        .filter((finance) => {
          const financeDate = finance.timestamp?.toDate();
          return (
            financeDate &&
            financeDate.getFullYear() ===
              (currentMonth === 1 ? currentYear - 1 : currentYear) &&
            financeDate.getMonth() + 1 ===
              (currentMonth === 1 ? 12 : currentMonth - 1)
          );
        })
        .reduce((total, finance) => total + (finance.amount || 0), 0);

      // Calculate total expected dues for the year
      let totalExpectedDues = 0;
      if (allocations.length > 0) {
        const allocation = allocations[0]; // Assuming one allocation per year
        const executiveMembers = members.filter(
          (member) => member.isExecutive
        ).length;
        const regularMembers = members.length - executiveMembers;

        // Expected for months that have passed (including current month)
        const monthsPassed = currentMonth;
        totalExpectedDues =
          executiveMembers * allocation.executiveAmount * monthsPassed +
          regularMembers * allocation.regularAmount * monthsPassed;
      }

      // Calculate outstanding dues
      const outstandingDues = Math.max(0, totalExpectedDues - currentYearDues);

      // Calculate growth rates
      const memberGrowthRate =
        stats.previousMonthMembers > 0
          ? ((members.length - stats.previousMonthMembers) /
              stats.previousMonthMembers) *
            100
          : 0;

      const duesGrowthRate =
        previousMonthDues > 0
          ? ((currentYearDues - previousMonthDues) / previousMonthDues) * 100
          : 0;

      const transactionsGrowthRate = 22; // Simplified - you can make this dynamic with historical data

      const overallGrowthRate = (memberGrowthRate + duesGrowthRate) / 2;

      setStats((prev) => ({
        ...prev,
        duesCollected: currentYearDues,
        outstandingDues,
        totalExpectedDues,
        previousMonthDues,
        growthRate: overallGrowthRate,
        memberGrowthRate,
        duesGrowthRate,
        transactionsGrowthRate,
      }));

      setLoading(false);
    };

    return () => {
      membersUnsubscribe();
      transactionsUnsubscribe();
      financesUnsubscribe();
      allocationsUnsubscribe();
    };
  }, []);

  return { stats, loading };
};

const RealTimeStats = () => {
  const { stats, loading } = useRealTimeStats();

  const formatCurrency = (amount) => {
    return `GH₵${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercentage = (value) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendColor = (value) => {
    return value >= 0 ? Colors.greenAccent : Colors.redAccent;
  };

  const statsData = [
    {
      icon: <MaterialIcons name="group" size={28} color={Colors.blueAccent} />,
      title: "Total Members",
      value: stats.totalMembers.toString(),
      subtitle: `Executives: ${stats.executiveMembers} | Regular: ${stats.regularMembers}`,
      trend: formatPercentage(stats.memberGrowthRate || 0),
      trendColor: getTrendColor(stats.memberGrowthRate || 0),
    },
    {
      icon: <FontAwesome name="money" size={28} color={Colors.greenAccent} />,
      title: "Dues Collected",
      value: formatCurrency(stats.duesCollected),
      subtitle: `Expected: ${formatCurrency(stats.totalExpectedDues)}`,
      trend: formatPercentage(stats.duesGrowthRate || 0),
      trendColor: getTrendColor(stats.duesGrowthRate || 0),
    },
    {
      icon: (
        <MaterialIcons
          name="report-problem"
          size={28}
          color={Colors.orangeAccent}
        />
      ),
      title: "Outstanding Dues",
      value: formatCurrency(stats.outstandingDues),
      subtitle: `Based on ${new Date().getMonth() + 1} months`,
      trend: stats.outstandingDues > 0 ? "Attention Needed" : "All Caught Up",
      trendColor:
        stats.outstandingDues > 0 ? Colors.orangeAccent : Colors.greenAccent,
    },
    {
      icon: <Ionicons name="receipt" size={28} color={Colors.yellowAccent} />,
      title: "Transactions",
      value: stats.transactionsCount.toString(),
      subtitle: "All time transactions",
      trend: formatPercentage(stats.transactionsGrowthRate || 0),
      trendColor: getTrendColor(stats.transactionsGrowthRate || 0),
    },
    {
      icon: (
        <MaterialIcons name="trending-up" size={28} color={Colors.tealAccent} />
      ),
      title: "Growth Rate",
      value: `${stats.growthRate?.toFixed(1) || 0}%`,
      subtitle: "Overall performance",
      trend: "vs last period",
      trendColor: Colors.tealAccent,
    },
  ];

  return { statsData, loading };
};

export default RealTimeStats;
