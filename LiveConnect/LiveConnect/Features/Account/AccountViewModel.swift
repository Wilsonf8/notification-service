//
//  AccountViewModel.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import Foundation

/// View model for the account sheet.
@MainActor
@Observable
final class AccountViewModel {
    /// The current user.
    var currentUser: User? {
        AuthManager.shared.currentUser
    }

    /// Signs out the current user.
    func signOut() {
        AuthManager.shared.signOut()
    }
}
