import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet, Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import * as Notifications from "expo-notifications";

const db = SQLite.openDatabaseSync("todos.db");

export default function App() {
  const [task, setTask] = useState("");
  const [todos, setTodos] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    createTable();
    loadTodos();
    setupNotifications();
  }, []);

  const createTable = () => {
    db.execSync(
      "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, completed INTEGER);"
    );
  };

  const loadTodos = () => {
    const result = db.getAllSync("SELECT * FROM todos");
    setTodos(result);
  };

  const addTodo = () => {
    if (!task.trim()) return;

    db.runSync("INSERT INTO todos (title, completed) VALUES (?, ?)", [
      task,
      0,
    ]);

    scheduleReminder(task);
    setTask("");
    loadTodos();
  };

  const toggleTodo = (id: number, completed: number) => {
    db.runSync("UPDATE todos SET completed=? WHERE id=?", [
      completed ? 0 : 1,
      id,
    ]);
    loadTodos();
  };

  const setupNotifications = async () => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  };

const scheduleReminder = async (title: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Todo Reminder",
      body: title,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
    },
  });
};

  const filteredTodos = todos.filter(todo => {
    if (filter === "COMPLETED") return todo.completed === 1;
    if (filter === "PENDING") return todo.completed === 0;
    return true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Todo List</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter task"
        value={task}
        onChangeText={setTask}
      />

      <Button title="Add Todo" onPress={addTodo} />

      <View style={styles.filters}>
        <Button title="All" onPress={() => setFilter("ALL")} />
        <Button title="Completed" onPress={() => setFilter("COMPLETED")} />
        <Button title="Pending" onPress={() => setFilter("PENDING")} />
      </View>

      <FlatList
        data={filteredTodos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggleTodo(item.id, item.completed)}>
            <Text style={[styles.todo, item.completed && styles.completed]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 40 },
  heading: { fontSize: 24, marginBottom: 10, textAlign: "center" },
  input: { borderWidth: 1, padding: 8, marginBottom: 10 },
  todo: { fontSize: 18, padding: 10 },
  completed: { textDecorationLine: "line-through", color: "gray" },
  filters: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
});
