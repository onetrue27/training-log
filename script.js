const dateInput = document.getElementById("date");
const exerciseInput = document.getElementById("exercise-name");
const form = document.getElementById("record-form"); 


//プレースホルダ
function updateDatePlaceholder() {
  const placeholder = document.getElementById("date-placeholder");
  const wrapper = document.querySelector(".date-wrapper");

  if (dateInput.value === "") {
    placeholder.style.display = "block";
    wrapper.classList.remove("has-value");
  } else {
    placeholder.style.display = "none";
    wrapper.classList.add("has-value");
  }
}

dateInput.addEventListener("input", updateDatePlaceholder);
dateInput.addEventListener("change", updateDatePlaceholder);
updateDatePlaceholder(); // ページ読み込み時にも1回実行しておく

//過去データの取得・整形
let allRecords = [];
fetch("https://script.google.com/macros/s/AKfycbxbl1HbkM3u6cw5TQFE7X_UlKLuGroRGWkVKS98M_ubUm1kr7VOv8OMpY7JhOa6nSe8/exec")
  .then(function(response) { return response.json(); })
  .then(function(data) {
    allRecords = data.slice(1).map(function(row) {
      return {
        date: row[1],
        exercise: row[2],
        setNumber: row[3],
        weight: row[4],
        reps: row[5]
      };
    });
    renderCalendar(currentYear, currentMonth);
  });


//日付をキーとして扱う関数
function getDateKey(dateString){
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() +1).padStart(2,"0");
    const day = String(date.getDate()).padStart(2,"0");
    return `${year}-${month}-${day}`;
}


let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

//カレンダーを描画する関数
function renderCalendar(year, month){
    document.getElementById("calendar-month-label").textContent = `${year}年${month +1}月`

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month +1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const dateKeysWithRecords = new Set(allRecords.map(function(r){return getDateKey(r.date);}));

    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = "";

    ["日","月","火","水","木","金","土"].forEach(function(w){
        const cell = document.createElement("div");
        cell.className = "calendar-weekday";
        cell.textContent = w;
        grid.appendChild(cell);
    });

    for (let i = 0; i < startWeekday; i++) {
        const blank =document.createElement("div");
        blank.className = "calendar-day calendar-day-empty";
        grid.appendChild(blank);   
    }

    for (let day = 1; day <= daysInMonth; day++){
        const cell = document.createElement("div");
        cell.className = "calendar-day";
        cell.textContent = day;

        const dateKey = `${year}-${String(month +1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

        if (dateKeysWithRecords.has(dateKey)){
            const dot = document.createElement("span");
            dot.className = "calendar-dot";
            cell.appendChild(dot);
        }

        cell.addEventListener("click",function(){
            showDayDetail(dateKey);
        });

        grid.appendChild(cell);
    }
}

//前の月のカレンダーに移動
document.getElementById("prev-month-btn").addEventListener("click", function() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentYear, currentMonth);
});

//次の月のカレンダーに移動
document.getElementById("next-month-btn").addEventListener("click", function() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentYear, currentMonth);
});


//指定した日の記録表示関数
function showDayDetail(dateKey){
    const detail = document.getElementById("day-detail");

    if (detail.dataset.currentDate === dateKey) {
        detail.innerHTML = "";
        detail.removeAttribute("data-current-date");
        return;
    }

    const dayRecords = allRecords.filter(function(r){
        return getDateKey(r.date) === dateKey;
    });

    if (dayRecords.length === 0){
        detail.innerHTML ="";
        detail.dataset.currentDate = dateKey;
        return;
    }

    const grouped = {};
    dayRecords.forEach(function(record){
        if (!grouped[record.exercise]) {
            grouped[record.exercise] = [];
        }
        grouped[record.exercise].push(record);
    });

    let html = `<h3>${formatDateForDisplay(dayRecords[0].date)}の記録</h3>`;

    for (const exercise in grouped){
        const rawData = grouped[exercise][0].date;
        html += `<div class = "day-detail-exercise">
        <div class = "exercise-header">
            <strong>${exercise}</strong>
            <button type = "button" class = "delete-exercise-btn" data-date = "${rawData}" data-exercise = "${exercise}">削除</button>
        </div>`;
        grouped[exercise].forEach(function(set){
            html += `${set.setNumber}セット目: ${set.weight}kg ${set.reps}回<br>`;
        });
        html += `</div>`;
    }

    detail.innerHTML = html;
    detail.dataset.currentDate = dateKey;
}

function deleteExerciseRecord(date, exercise) {
    fetch("https://script.google.com/macros/s/AKfycbxbl1HbkM3u6cw5TQFE7X_UlKLuGroRGWkVKS98M_ubUm1kr7VOv8OMpY7JhOa6nSe8/exec", {
        method: "POST",
        body: JSON.stringify({ action: "delete", date: date, exercise: exercise }),
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.status === "success") {
            allRecords = allRecords.filter(function(r) {
                return !(r.date === date && r.exercise === exercise);
            });
            renderCalendar(currentYear, currentMonth);
            showDayDetail(getDateKey(date));
        }
    });
}

document.getElementById("day-detail").addEventListener("click", function(event) {
    if (event.target.classList.contains("delete-exercise-btn")) {
        const date = event.target.dataset.date;
        const exercise = event.target.dataset.exercise;

        if (confirm(`${exercise}の記録を削除しますか？`)) {
            deleteExerciseRecord(date, exercise);
        }
    }
});

//候補の表示関数
function showSuggestions(matches) {
  const list = document.getElementById("exercise-suggestions");
  list.innerHTML = "";

  matches.forEach(function(name) {
    const li = document.createElement("li");
    li.textContent = name;
    li.addEventListener("click", function() {
      exerciseInput.value = name;
      list.innerHTML = "";
      showExerciseHistory(name);
    });
    list.appendChild(li);
  });
}

//日付表示形式変換関数
function formatDateForDisplay(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

//過去データの履歴表示関数
function showExerciseHistory(exerciseName) {
  const matched = allRecords.filter(function(record) {
    return record.exercise === exerciseName;
  });

  if (matched.length === 0) return;
  const lastDate = matched[matched.length - 1].date;
  let maxWeight = 0;
  let maxWeightReps = 0;
  let maxWeightDate = "";
  matched.forEach(function(record) {
    if (Number(record.weight) > maxWeight) {
      maxWeight = Number(record.weight);
      maxWeightReps = Number(record.reps);
      maxWeightDate = record.date;
    } else if (Number(record.weight) === maxWeight && Number(record.reps) > maxWeightReps) {
      maxWeightReps = Number(record.reps);
      maxWeightDate = record.date;
    }
  });
  const lastDateRecords = matched.filter(function(r) {
  return r.date === lastDate;});

  let w = 0; let r = 0;
  lastDateRecords.forEach(function(record) {
    if (Number(record.weight) > w) {
        w = Number(record.weight);
        r = record.reps;
    }
    else if (Number(record.weight) === w && Number(record.reps) > r) {
        r = record.reps;
    };
});
  document.getElementById("exercise-history").innerHTML =
    `前回: ${formatDateForDisplay(lastDate)} ${w}kg ${r}レップ<br>最高重量: ${formatDateForDisplay(maxWeightDate)} ${maxWeight}kg ${maxWeightReps}レップ`;
}


//種目入力欄に文字が入力されたときの処理
exerciseInput.addEventListener("input", function() {
  const value = exerciseInput.value;

  if (value === "") {
    document.getElementById("exercise-suggestions").innerHTML = "";
    document.getElementById("exercise-history").innerHTML = "";
    return;
  }

  const uniqueExercises = [...new Set(allRecords.map(function(r) { return r.exercise; }))];
  const matches = uniqueExercises.filter(function(name) { return name.includes(value); });

  showSuggestions(matches);

  // 完全一致していたら、候補を出さず履歴を表示
  if (uniqueExercises.includes(value)) {
    document.getElementById("exercise-suggestions").innerHTML = "";
    showExerciseHistory(value);
  } else {
    document.getElementById("exercise-history").innerHTML = "";
  }
});

//重量・レップ数の入力欄を追加する関数
function addSetRow(weightValue = "", repsValue = "") {
    const row = document.createElement("div");
    row.className = "set-row";
    row.innerHTML = `
        <input type="number" placeholder="重量(kg)" class="weight-input" autocomplete="off">
        <input type="number" placeholder="レップ数" class="reps-input" autocomplete="off">
    `;
    document.getElementById("set-list").appendChild(row);

    const inputs = row.querySelectorAll("input");
    inputs[0].value = weightValue;
    inputs[1].value = repsValue;
    };

//最後のセットの重量・レップ数を複製して新しい行を追加する関数
function duplicateLastSetRow() {
    const allRows = document.querySelectorAll(".set-row");

    if (allRows.length === 0) {
        addSetRow(); // まだ1つもセットがなければ、空の行を作るだけ
        return;
    }

    const lastRow = allRows[allRows.length - 1];
    const lastWeight = lastRow.querySelector(".weight-input").value;
    const lastReps = lastRow.querySelector(".reps-input").value;

    addSetRow(lastWeight, lastReps);
}

function deleteLastSetRow() {
    const allRows = document.querySelectorAll(".set-row");
    if (allRows.length > 1) { // 最低1セットは残す
        const lastRow = allRows[allRows.length - 1];
        lastRow.remove();
    };
}

//追加ボタンがクリックされたときに入力欄を追加する
document.getElementById("add-set-btn").addEventListener("click",function(){
    addSetRow();
});
//初期状態で1セット分の入力欄を追加
addSetRow();

document.getElementById("duplicate-set-btn").addEventListener("click", function() {
    duplicateLastSetRow();
});

document.getElementById("delete-set-btn").addEventListener("click", function() {
    deleteLastSetRow();
});

const submitBtn = document.getElementById("submit-btn");
//フォームが送信されたときの処理
form.addEventListener("submit", function(event){
    event.preventDefault();

    submitBtn.disabled = true; // 送信ボタンを無効化

    const weightInputs = document.querySelectorAll(".weight-input");
    const repsInputs = document.querySelectorAll(".reps-input");
    const records = [];
    
    //記録ボタンがクリックされたときにメッセージを表示
    document.getElementById("message").innerHTML = "記録を保存中…";

    //入力内容をrecords配列に格納
    let i = 1;
    weightInputs.forEach(function(input, index){
        if (dateInput.value !== "" && exerciseInput.value !== "" && input.value !== "" && repsInputs[index].value !== "") {
            records.push({
                date: dateInput.value,
                exercise: exerciseInput.value,
                setNumber: i++,
                weight: input.value,
                reps: repsInputs[index].value,
                memo: ""
            });
        }
    });

    //records配列が空の場合はメッセージを表示して処理を終了
    if (records.length === 0) {
        document.getElementById("message").innerHTML = "入力内容を確認してください。";
        submitBtn.disabled = false; // 送信ボタンを再度有効化
        setTimeout(function() {
            document.getElementById("message").innerHTML = "";
        }, 2000);
    return;
    }

    //Google Apps ScriptのWebアプリにデータを送信
    fetch("https://script.google.com/macros/s/AKfycbxbl1HbkM3u6cw5TQFE7X_UlKLuGroRGWkVKS98M_ubUm1kr7VOv8OMpY7JhOa6nSe8/exec",{
        method: "POST",
        body: JSON.stringify(records),
    })
    .then(function(response){return response.json();})
    .then(function(result){
        //console.log(result);

        if (result.status === "success") {
            allRecords = [...allRecords,...records];
            renderCalendar(currentYear, currentMonth);
            document.getElementById("message").innerHTML = "記録が保存されました。";
            setTimeout(function() {
                document.getElementById("message").innerHTML = "";
            }, 2000);
        }
        else {
            document.getElementById("message").innerHTML = "記録の保存に失敗しました。";
            setTimeout(function() {
                document.getElementById("message").innerHTML = "";
            }, 2000);
        }
        exerciseInput.value = "";
        document.getElementById("set-list").innerHTML = "";
        document.getElementById("exercise-history").innerHTML = "";
        addSetRow();

        submitBtn.disabled = false; // 送信ボタンを再度有効化
    });

});
