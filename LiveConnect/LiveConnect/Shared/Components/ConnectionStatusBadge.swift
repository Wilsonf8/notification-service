//
//  ConnectionStatusBadge.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

/// Badge showing WebSocket connection status.
struct ConnectionStatusBadge: View {
    let isConnected: Bool

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(isConnected ? Color.green : Color.red)
                .frame(width: 6, height: 6)

            Text(isConnected ? "Connected" : "Disconnected")
                .font(.caption)
                .foregroundStyle(isConnected ? .green : .red)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background((isConnected ? Color.green : Color.red).opacity(0.1))
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        VStack(spacing: 16) {
            ConnectionStatusBadge(isConnected: true)
            ConnectionStatusBadge(isConnected: false)
        }
    }
}
