#!/bin/bash
# Create NocoBase collections - run this with your actual NocoBase URL

API_URL="${NOCOBASE_URL:-http://localhost:8091}/api"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc3NDY0NTY5MiwiZXhwIjoxNzc0NzMyMDkyfQ.ktX5jcezmLhxZISaBqqHS_eg45FIIogkW8NQb-EL7n4"

echo "Creating collections on: $API_URL"
echo ""

# Function to create collection
create_collection() {
  local name=$1
  local title=$2
  
  echo "Creating collection: $name"
  curl -s -X POST "$API_URL/collections:create" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"name\": \"$name\",
      \"title\": \"$title\",
      \"template\": \"general\",
      \"logging\": true,
      \"autoGenId\": true,
      \"createdAt\": true,
      \"updatedAt\": true,
      \"sortable\": true
    }" | jq -r '.data.name // .errors[0].message // "created"'
}

# Function to create field
create_field() {
  local collection=$1
  local name=$2
  local interface=$3
  local type=$4
  local options=$5
  
  echo "  + $name ($interface)"
  
  local payload="{
    \"collectionName\": \"$collection\",
    \"name\": \"$name\",
    \"interface\": \"$interface\",
    \"type\": \"$type\",
    \"uiSchema\": { \"title\": \"$name\" $options }
  }"
  
  curl -s -X POST "$API_URL/fields:create" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$payload" > /dev/null
}

echo "=== EXERCISE ==="
create_collection "exercise" "exercise"
create_field "exercise" "date" "datetime" "date" ', "x-component": "DatePicker"'
create_field "exercise" "timestamp" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "exercise" "duration_minutes" "integer" "integer" ', "x-component": "InputNumber", "x-component-props": { "min": 1, "max": 300 }'
create_field "exercise" "workout_type" "select" "string" ', "x-component": "Select", "enum": [{"value":"strength","label":"strength"},{"value":"cardio","label":"cardio"},{"value":"hiit","label":"hiit"},{"value":"yoga","label":"yoga"},{"value":"stretching","label":"stretching"},{"value":"sport","label":"sport"},{"value":"outdoor","label":"outdoor"},{"value":"custom","label":"custom"}]'
create_field "exercise" "energy_level" "integer" "integer" ', "x-component": "InputNumber", "x-component-props": { "min": 1, "max": 10 }'
create_field "exercise" "location" "input" "string" ', "x-component": "Input"'
create_field "exercise" "notes" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "exercise" "exercises_json" "json" "json" ', "x-component": "Json"'
create_field "exercise" "total_volume" "integer" "integer" ', "x-component": "InputNumber"'
create_field "exercise" "total_calories" "integer" "integer" ', "x-component": "InputNumber"'
create_field "exercise" "muscle_groups" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"chest","label":"chest"},{"value":"back","label":"back"},{"value":"shoulders","label":"shoulders"},{"value":"biceps","label":"biceps"},{"value":"triceps","label":"triceps"},{"value":"legs","label":"legs"},{"value":"glutes","label":"glutes"},{"value":"core","label":"core"},{"value":"calves","label":"calves"},{"value":"forearms","label":"forearms"},{"value":"full_body","label":"full body"},{"value":"cardio","label":"cardio"}]'
create_field "exercise" "equipment_used" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"none","label":"none"},{"value":"dumbbells","label":"dumbbells"},{"value":"barbell","label":"barbell"},{"value":"kettlebell","label":"kettlebell"},{"value":"machines","label":"machines"},{"value":"cables","label":"cables"},{"value":"bodyweight","label":"bodyweight"},{"value":"resistance_bands","label":"resistance bands"},{"value":"medicine_ball","label":"medicine ball"}]'
create_field "exercise" "is_template" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "exercise" "template_name" "input" "string" ', "x-component": "Input"'
create_field "exercise" "completed" "checkbox" "boolean" ', "x-component": "Checkbox", "default": true'
create_field "exercise" "rpe" "integer" "integer" ', "x-component": "InputNumber", "x-component-props": { "min": 1, "max": 10 }'
create_field "exercise" "heart_rate_avg" "integer" "integer" ', "x-component": "InputNumber"'
create_field "exercise" "heart_rate_max" "integer" "integer" ', "x-component": "InputNumber"'
create_field "exercise" "weather" "input" "string" ', "x-component": "Input"'

echo ""
echo "=== SLEEP ==="
create_collection "sleep" "sleep"
create_field "sleep" "date" "datetime" "date" ', "x-component": "DatePicker"'
create_field "sleep" "bedtime" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "sleep" "wake_time" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "sleep" "sleep_duration_minutes" "integer" "integer" ', "x-component": "InputNumber"'
create_field "sleep" "time_to_fall_asleep_minutes" "integer" "integer" ', "x-component": "InputNumber"'
create_field "sleep" "awakenings_count" "integer" "integer" ', "x-component": "InputNumber"'
create_field "sleep" "awake_duration_minutes" "integer" "integer" ', "x-component": "InputNumber"'
create_field "sleep" "sleep_quality" "integer" "integer" ', "x-component": "InputNumber", "x-component-props": { "min": 1, "max": 10 }'
create_field "sleep" "sleep_efficiency_percent" "number" "float" ', "x-component": "InputNumber"'
create_field "sleep" "deep_sleep_percent" "number" "float" ', "x-component": "InputNumber"'
create_field "sleep" "rem_sleep_percent" "number" "float" ', "x-component": "InputNumber"'
create_field "sleep" "light_sleep_percent" "number" "float" ', "x-component": "InputNumber"'
create_field "sleep" "sleep_stage_data" "json" "json" ', "x-component": "Json"'
create_field "sleep" "sleep_environment" "json" "json" ', "x-component": "Json"'
create_field "sleep" "bedtime_routine" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"no_screens","label":"no screens"},{"value":"meditation","label":"meditation"},{"value":"reading","label":"reading"},{"value":"shower","label":"shower"},{"value":"tea","label":"tea"},{"value":"supplements","label":"supplements"},{"value":"stretching","label":"stretching"}]'
create_field "sleep" "sleep_disruptions" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"bathroom","label":"bathroom"},{"value":"partner","label":"partner"},{"value":"noise","label":"noise"},{"value":"temperature","label":"temperature"},{"value":"stress","label":"stress"},{"value":"pain","label":"pain"},{"value":"pet","label":"pet"},{"value":"alarm","label":"alarm"}]'
create_field "sleep" "dreams_recorded" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "sleep" "dream_notes" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "sleep" "sleep_aid_used" "input" "string" ', "x-component": "Input"'
create_field "sleep" "caffeine_last_consumed" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "sleep" "alcohol_consumed" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "sleep" "screen_time_before_bed_minutes" "integer" "integer" ', "x-component": "InputNumber"'
create_field "sleep" "stress_level" "integer" "integer" ', "x-component": "InputNumber", "x-component-props": { "min": 1, "max": 10 }'
create_field "sleep" "mood_on_waking" "select" "string" ', "x-component": "Select", "enum": [{"value":"refreshed","label":"refreshed"},{"value":"groggy","label":"groggy"},{"value":"tired","label":"tired"},{"value":"energized","label":"energized"},{"value":"anxious","label":"anxious"}]'
create_field "sleep" "snoring_recorded" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "sleep" "device_synced" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "sleep" "device_data_source" "input" "string" ', "x-component": "Input"'

echo ""
echo "=== FINANCES ==="
create_collection "finances" "finances"
create_field "finances" "transaction_date" "datetime" "date" ', "x-component": "DatePicker"'
create_field "finances" "timestamp" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "finances" "transaction_type" "select" "string" ', "x-component": "Select", "enum": [{"value":"income","label":"income"},{"value":"expense","label":"expense"},{"value":"transfer","label":"transfer"},{"value":"refund","label":"refund"},{"value":"investment","label":"investment"}]'
create_field "finances" "amount" "number" "float" ', "x-component": "InputNumber", "x-component-props": { "precision": 2 }'
create_field "finances" "currency" "input" "string" ', "x-component": "Input", "default": "USD"'
create_field "finances" "description" "input" "string" ', "x-component": "Input"'
create_field "finances" "merchant" "input" "string" ', "x-component": "Input"'
create_field "finances" "category" "select" "string" ', "x-component": "Select", "enum": [{"value":"housing","label":"housing"},{"value":"food","label":"food"},{"value":"transportation","label":"transportation"},{"value":"utilities","label":"utilities"},{"value":"healthcare","label":"healthcare"},{"value":"entertainment","label":"entertainment"},{"value":"shopping","label":"shopping"},{"value":"personal_care","label":"personal care"},{"value":"education","label":"education"},{"value":"savings","label":"savings"},{"value":"investments","label":"investments"},{"value":"income","label":"income"},{"value":"gifts","label":"gifts"},{"value":"travel","label":"travel"},{"value":"pets","label":"pets"},{"value":"other","label":"other"}]'
create_field "finances" "subcategory" "input" "string" ', "x-component": "Input"'
create_field "finances" "account" "select" "string" ', "x-component": "Select", "enum": [{"value":"checking","label":"checking"},{"value":"savings","label":"savings"},{"value":"credit_card","label":"credit card"},{"value":"investment","label":"investment"},{"value":"cash","label":"cash"},{"value":"crypto","label":"crypto"},{"value":"venmo","label":"venmo"},{"value":"paypal","label":"paypal"},{"value":"other","label":"other"}]'
create_field "finances" "payment_method" "select" "string" ', "x-component": "Select", "enum": [{"value":"credit_card","label":"credit card"},{"value":"debit_card","label":"debit card"},{"value":"cash","label":"cash"},{"value":"check","label":"check"},{"value":"bank_transfer","label":"bank transfer"},{"value":"paypal","label":"paypal"},{"value":"venmo","label":"venmo"},{"value":"crypto","label":"crypto"},{"value":"apple_pay","label":"apple pay"},{"value":"google_pay","label":"google pay"}]'
create_field "finances" "is_recurring" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "finances" "recurrence_pattern" "json" "json" ', "x-component": "Json"'
create_field "finances" "is_planned" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "finances" "budget_category" "input" "string" ', "x-component": "Input"'
create_field "finances" "tags" "multipleSelect" "array" ', "x-component": "Select", "mode": "tags"'
create_field "finances" "notes" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "finances" "tax_deductible" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "finances" "tax_category" "input" "string" ', "x-component": "Input"'
create_field "finances" "split_transaction" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "finances" "split_details" "json" "json" ', "x-component": "Json"'
create_field "finances" "linked_transaction_id" "input" "string" ', "x-component": "Input"'
create_field "finances" "is_pending" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "finances" "cleared_date" "datetime" "date" ', "x-component": "DatePicker"'
create_field "finances" "running_balance" "number" "float" ', "x-component": "InputNumber"'
create_field "finances" "import_source" "input" "string" ', "x-component": "Input"'

echo ""
echo "=== HABITS ==="
create_collection "habits" "habits"
create_field "habits" "habit_type" "select" "string" ', "x-component": "Select", "enum": [{"value":"habit","label":"habit"},{"value":"task","label":"task"},{"value":"goal_milestone","label":"goal milestone"}]'
create_field "habits" "name" "input" "string" ', "x-component": "Input"'
create_field "habits" "description" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "habits" "category" "select" "string" ', "x-component": "Select", "enum": [{"value":"health","label":"health"},{"value":"productivity","label":"productivity"},{"value":"learning","label":"learning"},{"value":"social","label":"social"},{"value":"creativity","label":"creativity"},{"value":"finance","label":"finance"},{"value":"household","label":"household"},{"value":"mindfulness","label":"mindfulness"},{"value":"fitness","label":"fitness"},{"value":"hygiene","label":"hygiene"}]'
create_field "habits" "frequency_type" "select" "string" ', "x-component": "Select", "enum": [{"value":"daily","label":"daily"},{"value":"weekly","label":"weekly"},{"value":"weekdays_only","label":"weekdays only"},{"value":"weekends_only","label":"weekends only"},{"value":"every_x_days","label":"every x days"},{"value":"specific_days","label":"specific days"}]'
create_field "habits" "frequency_config" "json" "json" ', "x-component": "Json"'
create_field "habits" "target_count_per_period" "integer" "integer" ', "x-component": "InputNumber"'
create_field "habits" "time_of_day" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"morning","label":"morning"},{"value":"afternoon","label":"afternoon"},{"value":"evening","label":"evening"},{"value":"night","label":"night"},{"value":"anytime","label":"anytime"}]'
create_field "habits" "estimated_duration_minutes" "integer" "integer" ', "x-component": "InputNumber"'
create_field "habits" "color" "color" "string" ', "x-component": "ColorPicker"'
create_field "habits" "icon" "input" "string" ', "x-component": "Input"'
create_field "habits" "priority" "select" "string" ', "x-component": "Select", "enum": [{"value":"low","label":"low"},{"value":"medium","label":"medium"},{"value":"high","label":"high"},{"value":"critical","label":"critical"}]'
create_field "habits" "is_active" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "habits" "archived_at" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "habits" "start_date" "datetime" "date" ', "x-component": "DatePicker"'
create_field "habits" "end_date" "datetime" "date" ', "x-component": "DatePicker"'
create_field "habits" "reminder_enabled" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "habits" "reminder_time" "time" "string" ', "x-component": "TimePicker"'
create_field "habits" "reminder_days" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"mon","label":"mon"},{"value":"tue","label":"tue"},{"value":"wed","label":"wed"},{"value":"thu","label":"thu"},{"value":"fri","label":"fri"},{"value":"sat","label":"sat"},{"value":"sun","label":"sun"}]'
create_field "habits" "current_streak" "integer" "integer" ', "x-component": "InputNumber", "default": 0'
create_field "habits" "longest_streak" "integer" "integer" ', "x-component": "InputNumber", "default": 0'
create_field "habits" "total_completions" "integer" "integer" ', "x-component": "InputNumber", "default": 0'
create_field "habits" "completion_rate_percent" "number" "float" ', "x-component": "InputNumber"'
create_field "habits" "last_completed_at" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "habits" "streak_history" "json" "json" ', "x-component": "Json"'
create_field "habits" "linked_goal" "input" "string" ', "x-component": "Input"'
create_field "habits" "linked_media" "input" "string" ', "x-component": "Input"'
create_field "habits" "success_criteria" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "habits" "failure_criteria" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "habits" "reward_description" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "habits" "punishment_description" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "habits" "is_public" "checkbox" "boolean" ', "x-component": "Checkbox"'

echo ""
echo "=== MEDIA ==="
create_collection "media" "media"
create_field "media" "media_type" "select" "string" ', "x-component": "Select", "enum": [{"value":"book","label":"book"},{"value":"movie","label":"movie"},{"value":"tv_show","label":"tv show"},{"value":"documentary","label":"documentary"},{"value":"podcast","label":"podcast"},{"value":"music_album","label":"music album"},{"value":"video_game","label":"video game"},{"value":"article","label":"article"},{"value":"comic_manga","label":"comic/manga"},{"value":"audiobook","label":"audiobook"},{"value":"youtube_video","label":"youtube video"},{"value":"course","label":"course"},{"value":"live_event","label":"live event"}]'
create_field "media" "title" "input" "string" ', "x-component": "Input"'
create_field "media" "creator" "input" "string" ', "x-component": "Input"'
create_field "media" "series" "input" "string" ', "x-component": "Input"'
create_field "media" "series_number" "number" "float" ', "x-component": "InputNumber"'
create_field "media" "release_year" "integer" "integer" ', "x-component": "InputNumber"'
create_field "media" "genre" "multipleSelect" "array" ', "x-component": "Select", "mode": "tags"'
create_field "media" "tags" "multipleSelect" "array" ', "x-component": "Select", "mode": "tags"'
create_field "media" "format" "select" "string" ', "x-component": "Select", "enum": [{"value":"physical","label":"physical"},{"value":"digital","label":"digital"},{"value":"streaming","label":"streaming"},{"value":"live","label":"live"}]'
create_field "media" "platform" "input" "string" ', "x-component": "Input"'
create_field "media" "language" "input" "string" ', "x-component": "Input", "default": "en"'
create_field "media" "length" "json" "json" ', "x-component": "Json"'
create_field "media" "cover_image_url" "url" "string" ', "x-component": "Input.URL"'
create_field "media" "external_id" "json" "json" ', "x-component": "Json"'
create_field "media" "status" "select" "string" ', "x-component": "Select", "enum": [{"value":"wishlist","label":"wishlist"},{"value":"backlog","label":"backlog"},{"value":"in_progress","label":"in progress"},{"value":"paused","label":"paused"},{"value":"completed","label":"completed"},{"value":"abandoned","label":"abandoned"},{"value":"rewatching","label":"rewatching"},{"value":"rereading","label":"rereading"}]'
create_field "media" "priority" "integer" "integer" ', "x-component": "InputNumber", "x-component-props": { "min": 1, "max": 10 }'
create_field "media" "started_at" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "media" "completed_at" "datetime" "date" ', "x-component": "DatePicker", "x-component-props": { "showTime": true }'
create_field "media" "completion_percent" "number" "float" ', "x-component": "InputNumber", "x-component-props": { "min": 0, "max": 100 }'
create_field "media" "current_position" "json" "json" ', "x-component": "Json"'
create_field "media" "rating" "integer" "integer" ', "x-component": "InputNumber", "x-component-props": { "min": 1, "max": 10 }'
create_field "media" "would_recommend" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "media" "review_text" "textarea" "text" ', "x-component": "Input.TextArea"'
create_field "media" "review_public" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "media" "key_takeaways" "json" "json" ', "x-component": "Json"'
create_field "media" "favorite_quotes" "json" "json" ', "x-component": "Json"'
create_field "media" "mood_while_consuming" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"excited","label":"excited"},{"value":"relaxed","label":"relaxed"},{"value":"inspired","label":"inspired"},{"value":"educational","label":"educational"},{"value":"entertained","label":"entertained"},{"value":"bored","label":"bored"},{"value":"frustrated","label":"frustrated"},{"value":"emotional","label":"emotional"}]'
create_field "media" "consumed_with" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"alone","label":"alone"},{"value":"partner","label":"partner"},{"value":"family","label":"family"},{"value":"friends","label":"friends"},{"value":"public","label":"public"}]'
create_field "media" "time_of_day_consumed" "multipleSelect" "array" ', "x-component": "Select", "mode": "multiple", "enum": [{"value":"morning","label":"morning"},{"value":"afternoon","label":"afternoon"},{"value":"evening","label":"evening"},{"value":"night","label":"night"}]'
create_field "media" "reconsume_count" "integer" "integer" ', "x-component": "InputNumber", "default": 0'
create_field "media" "linked_habit" "input" "string" ', "x-component": "Input"'
create_field "media" "source_recommendation" "input" "string" ', "x-component": "Input"'
create_field "media" "cost" "number" "float" ', "x-component": "InputNumber"'
create_field "media" "owned" "checkbox" "boolean" ', "x-component": "Checkbox"'
create_field "media" "lent_to" "input" "string" ', "x-component": "Input"'
create_field "media" "return_date" "datetime" "date" ', "x-component": "DatePicker"'

echo ""
echo "=== ALL COLLECTIONS CREATED ==="
echo ""
echo "Collections: exercise, sleep, finances, habits, media"
echo "Run this script with: NOCOBASE_URL=http://your-nocobase:13000 ./create-collections.sh"
