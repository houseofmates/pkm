// prevents additional console window on windows in release, do not remove!!#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  app_lib::run();
}
