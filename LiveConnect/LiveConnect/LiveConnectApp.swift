//
//  LiveConnectApp.swift
//  LiveConnect
//
//  Created by wilson flores on 2/5/26.
//

import SwiftUI

@main
struct LiveConnectApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
                .task {
                    await PushNotificationManager.shared.requestPermission()
                }
        }
    }
}
