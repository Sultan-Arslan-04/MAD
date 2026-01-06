import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { createClient } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";

/* ---------- SUPABASE SETUP ---------- */
const supabaseUrl = "https://gulthrunoifhjckttikl.supabase.co";        // add your Supabase URL
const supabaseAnonKey = "sb_publishable_xQLv9u4zNDA-4D7y_M-qRg_QMyeVtAU";   // add your Supabase anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ---------- NOTIFICATION HANDLER ---------- */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [task, setTask] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [todos, setTodos] = useState<any[]>([]);

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  /* ---------- FETCH TODOS ---------- */
  const fetchTodos = async () => {
    const { data } = await supabase
      .from("todos")
      .select("*")
      .order("id", { ascending: false });

    if (data) setTodos(data);
  };

  useEffect(() => {
    fetchTodos();
    Notifications.requestPermissionsAsync();
  }, []);

  /* ---------- DATE PICKER ---------- */
  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDate(false);
    if (selectedDate) {
      setDate(selectedDate);
      setShowTime(true);
    }
  };

  /* ---------- TIME PICKER ---------- */
  const onTimeChange = (_: any, selectedTime?: Date) => {
    setShowTime(false);
    if (selectedTime && date) {
      const finalDate = new Date(date);
      finalDate.setHours(selectedTime.getHours());
      finalDate.setMinutes(selectedTime.getMinutes());
      setDate(finalDate);
    }
  };

  /* ---------- ADD TODO ---------- */
  const addTodo = async () => {
    if (!task || !date) {
      Alert.alert("Error", "Enter task and select date & time");
      return;
    }

    await supabase.from("todos").insert({
      title: task,
      completed: false,
      due_time: date.toISOString(),
    });

    if (Platform.OS !== "web") {
      const seconds = Math.max(
        Math.floor((date.getTime() - Date.now()) / 1000),
        1
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Todo Reminder",
          body: task,
        },
        trigger: {
          type: "timeInterval",
          seconds,
          repeats: false,
        } as Notifications.TimeIntervalTriggerInput,
      });

    }

    setTask("");
    setDate(null);
    fetchTodos();
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id);

    fetchTodos();
  };

  const deleteTodo = async (id: number) => {
    await supabase.from("todos").delete().eq("id", id);
    fetchTodos();
  };

  const isTimeOver = (due: string) =>
    new Date(due).getTime() < Date.now();

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Todo App</Text>

      <TextInput
        style={styles.input}
        placeholder="Task name"
        value={task}
        onChangeText={setTask}
      />

      <Button
        title={date ? date.toLocaleString() : "Select Date & Time"}
        onPress={() => setShowDate(true)}
      />

      <View style={{ marginVertical: 8 }}>
        <Button title="Add Task" onPress={addTodo} />
      </View>

      {showDate && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          onChange={onDateChange}
        />
      )}

      {showTime && (
        <DateTimePicker
          value={date || new Date()}
          mode="time"
          onChange={onTimeChange}
        />
      )}

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.todo}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.text,
                  item.completed && styles.completed,
                ]}
              >
                {item.title}
              </Text>

              <Text style={styles.time}>
                ⏰ {new Date(item.due_time).toLocaleString()}
              </Text>

              {!item.completed && isTimeOver(item.due_time) && (
                <Text style={styles.over}>⛔ Time Over</Text>
              )}
            </View>

            <Button
              title={item.completed ? "Undo" : "Done"}
              onPress={() =>
                toggleTodo(item.id, item.completed)
              }
            />

            <Button
              title="Del"
              color="red"
              onPress={() => deleteTodo(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    borderRadius: 5,
  },
  todo: {
    flexDirection: "row",
    marginVertical: 8,
    alignItems: "center",
  },
  text: {
    fontSize: 16,
  },
  completed: {
    textDecorationLine: "line-through",
    color: "gray",
  },
  time: {
    fontSize: 12,
    color: "gray",
  },
  over: {
    color: "red",
    fontWeight: "bold",
  },
});
