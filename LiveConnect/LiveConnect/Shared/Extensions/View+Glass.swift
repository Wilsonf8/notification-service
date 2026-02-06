//
//  View+Glass.swift
//  LiveConnect
//
//  Created by Claude on 2/5/26.
//

import SwiftUI

extension View {
    /// Applies a glass background effect to the view.
    func glassBackground() -> some View {
        self.glassEffect()
    }

    /// Applies a glass card style to the view.
    func glassCard() -> some View {
        self.glassEffect()
    }
}
