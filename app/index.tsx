import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";

import * as Notifications from "expo-notifications";
import { createClient } from "@supabase/supabase-js";

/* ---------------- SUPABASE SETUP ---------------- */
const supabaseUrl = "https://gulthrunoifhjckttikl.supabase.co";
const supabaseAnonKey = "sb_publishable_xQLv9u4zNDA-4D7y_M-qRg_QMyeVtAU";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ---------------- NOTIFICATION HANDLER ---------------- */
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
  const [time, setTime] = useState("");
  const [todos, setTodos] = useState<any[]>([]);

  /* ---------------- FETCH TODOS ---------------- */
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

  /* ---------------- ADD TODO ---------------- */
  const addTodo = async () => {
    if (!task || !time) {
      Alert.alert("Error", "Please enter task and time in YYYY-MM-DD HH:MM");
      return;
    }

    const date = new Date(time);

    await supabase.from("todos").insert({
      title: task,
      completed: false,
      due_time: date.toISOString(),
    });

    // 🔔 Notifications only on APK
    if (Platform.OS !== "web") {
      const seconds = Math.max(Math.floor((date.getTime() - Date.now()) / 1000), 1);

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
    setTime("");
    fetchTodos();
  };

  /* ---------------- TOGGLE COMPLETE ---------------- */
  const toggleTodo = async (id: number, completed: boolean) => {
    await supabase.from("todos").update({ completed: !completed }).eq("id", id);
    fetchTodos();
  };

  /* ---------------- DELETE TODO ---------------- */
  const deleteTodo = async (id: number) => {
    await supabase.from("todos").delete().eq("id", id);
    fetchTodos();
  };

  /* ---------------- TIME OVER CHECK ---------------- */
  const isTimeOver = (due: string) => {
    return new Date(due).getTime() < Date.now();
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Todo App</Text>

      <TextInput
        style={styles.input}
        placeholder="Task name"
        value={task}
        onChangeText={setTask}
      />

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD HH:MM"
        value={time}
        onChangeText={setTime}
      />

      <Button title="Add Task" onPress={addTodo} />

      <FlatList
        data={todos}
        keyExtractor={(item) => item.id.toString()}
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
              onPress={() => toggleTodo(item.id, item.completed)}
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

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginTop: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
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
