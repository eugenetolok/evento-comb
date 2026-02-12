import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure } from "@heroui/react";
import { axiosInstanceAuth } from "@/axiosConfig";
import AddMemberModal from "@/components/popups/newMember";
import AddAutoModal from "@/components/popups/newAuto";
import ImportMembersModal from "@/components/popups/membersImport";
import ImportAutosModal from "@/components/popups/autosImport";
import CompanyMembers from "@/components/popups/companyMembers";
import CompanyAutos from "@/components/popups/companyAutos";


const CompanyNavbar = ({ company }: any) => {
    return (
        <>
            <div className="mr-7 text-right">
                <div className="flex justify-end items-center space-x-2"> {/* row 3 */}
                    <CompanyMembers company={company} />
                    <CompanyAutos company={company} />
                </div>
            </div>
        </>
    )
};

export default CompanyNavbar;