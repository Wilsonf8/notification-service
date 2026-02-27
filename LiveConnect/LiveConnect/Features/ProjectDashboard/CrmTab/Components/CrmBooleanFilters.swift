//
//  CrmBooleanFilters.swift
//  LiveConnect
//

import SwiftUI

/// Horizontal scrollable row of boolean toggle filter buttons for the CRM visitor list.
struct CrmBooleanFilters: View {
    /// Whether to filter by visitors who have been in a call.
    @Binding var hasBeenInCall: Bool

    /// Whether to filter by visitors who submitted a contact form.
    @Binding var hasContactForm: Bool

    /// Whether to filter by visitors who have contact info.
    @Binding var hasContactInfo: Bool

    /// Whether to filter by visitors with rep-updated info.
    @Binding var repUpdatedInfo: Bool

    /// Whether to filter by visitors currently online.
    @Binding var onlineNow: Bool

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterButton("In Call", icon: "phone.fill", isOn: $hasBeenInCall)
                filterButton("Form", icon: "envelope.fill", isOn: $hasContactForm)
                filterButton("Contact", icon: "person.text.rectangle", isOn: $hasContactInfo)
                filterButton("Rep Updated", icon: "pencil.line", isOn: $repUpdatedInfo)
                filterButton("Online", icon: "wifi", isOn: $onlineNow)
            }
        }
    }

    /// Creates a toggle filter pill button.
    /// - Parameters:
    ///   - label: The button label text.
    ///   - icon: The SF Symbol name.
    ///   - isOn: Binding to the boolean state.
    /// - Returns: The toggle button view.
    private func filterButton(_ label: String, icon: String, isOn: Binding<Bool>) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(label)
                    .font(.system(size: 13, weight: .medium, design: .monospaced))
            }
            .foregroundStyle(isOn.wrappedValue ? .black : .white)
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(isOn.wrappedValue ? Color.yellow : Color.white.opacity(0.1))
        }
    }
}

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        CrmBooleanFilters(
            hasBeenInCall: .constant(false),
            hasContactForm: .constant(true),
            hasContactInfo: .constant(false),
            repUpdatedInfo: .constant(false),
            onlineNow: .constant(true)
        )
        .padding()
    }
}
