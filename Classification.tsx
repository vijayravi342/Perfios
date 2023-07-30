import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch, connect } from 'react-redux'
import classNames from 'classnames';
import { Paper } from '@material-ui/core';
import CategoryTab from 'containers/MultiDocClassifierContainer/CategoryTab';
import TreeView from 'containers/MultiDocClassifierContainer/TreeView';
import Categories from 'containers/MultiDocClassifierContainer/Categories';
import { PreProcessedTreeData } from './TreeUtility';
import { showReactNotification, getNextScreenNameAndIndex, getPreviousScreenNameAndIndex } from 'utils/commonUtils';
import { getOCROutput, saveUpdatedBoundingBoxInfo } from 'actions/drawingBoardActions';
import { IBankStatementFormList, IBucket, IClusteringReducer, ICommonReducer, IDocumentReducer, IDrawingBoardReducer, IMultiDocClassifierReducer, INotifySnackbar, IReducer, IRuleResult, IUiWorkflowReducer, IUpdatedScreenInfo, nextPreviousCallBack } from 'interfaces/commonInterfaces';
import { createContainerList } from 'utils/invoiceUtils';
import { applyRule } from 'utils/ruleEngineUtils';
import { checkAndGetTemplateValues } from 'utils/templateUtils';
import { setStateData } from 'actions/commonActions';
import { getDocumentCategoriesAndInstitutionNames, setAutoOcr, setClassificationData, setTemplateList } from 'actions/MultiDocClassifierActions';
import { IAutoOcrResponse, ITasks } from 'interfaces/tableDrawingInterfaces';
import './ClassificationScreen.scss'
import ClassifierUtilityButton from './ClassifierUtilityButton';
// import { IDocumentCategory } from 'interfaces/multiDocClassifierInterfaces';
import { IScreenTemplate, IScreenTemplateValues } from 'interfaces/uiWorkFlowInterfaces';
import { properties } from 'constants/properties';
import { NotificationType } from 'constants/notificationType';
import { NotificationSeverity, ReactNotificationType } from 'constants/common';
import { messages } from 'constants/messages';
import { ModalType } from 'constants/ModalTypes';
import { TemplateTypesEnum } from 'constants/templateConstants';
import { HIDE_MODAL, SHOW_MODAL } from 'actions/modalActions';
import { hideNotification, showNotification } from 'actions/notificationActions';
import { updateCurrentScreenInfo } from 'actions/uiWorkFlowActions';

interface IProps {
  divDisabled: boolean,
  updateScreenStatus: (nextState: string, startStatus: boolean) => void;
}

interface IMapStateToProps {
  reducer: ICommonReducer;
  documentReducer: IDocumentReducer,
  drawingBoardReducer: IDrawingBoardReducer,
  uiWorkflowReducer: IUiWorkflowReducer,
  clusteringReducer: IClusteringReducer,
  multiDocClassifierReducer: IMultiDocClassifierReducer,
}

interface IMatchDispatchToProps {
  setStateData: (payload: object) => void;
  updateCurrentScreenInfo: (payload: IUpdatedScreenInfo) => void;
  setSelectedBucket: (payload: number) => void;
  notify: (notificationType: NotificationType, params: INotifySnackbar) => void,
  hideNotification: () => void,
}

const Classification: React.FC<IProps & IMapStateToProps & IMatchDispatchToProps> = (props) => {
  const dispatch = useDispatch();
  const [autoOcrResponseArray, setAutoOcrResponseArray] = useState<Array<IAutoOcrResponse>>([]);
  const [isClassificationValidated, setIsClassificationValidated] = useState(false as boolean);
  const [isClassificationSaved, setIsClassificationSaved] = useState(false as boolean);
  let templateListResponse: Array<IScreenTemplate> | undefined = useSelector((state: IReducer) => state.uiWorkflowReducer.templatesList);

  useEffect(() => {
    let containerList: Array<IBankStatementFormList> = createContainerList(props.documentReducer, props.reducer);
    props.setStateData({
      formList: containerList,
      count: props.documentReducer.taskList.length,
      src: props.documentReducer.taskList[0].taskList ? props.documentReducer.taskList[0].taskList[0].sharedFileURI : props.documentReducer.taskList[0].sharedFileURI,
      perInstituteCount: props.documentReducer.taskList[0].length
    });
    props.drawingBoardReducer.autoOcrResponse.clear();
    props.drawingBoardReducer.parsedOcrOutput.clear();
    for (let i = 0; i < props.documentReducer.taskList.length; i++) {
      if (props.documentReducer.taskList[i].taskList) {
        for (let j = 0; j < props.documentReducer.taskList[i].taskList.length; j++) {
          if (props.documentReducer.taskList[i].taskList[j].isGroupParent) {
            if (props.documentReducer.taskList[i].taskList[j].extraParamMap.autoCuratedJSONFilePath !== "null") {
              let payload = {
                taskId: props.documentReducer.taskList[i].taskList[j].taskId,
                propertyName: properties.autoCuratedJSONFilePath,
              };
              dispatch(getOCROutput(payload));
            }
          }
        }
      } else {
        let taskElement = props.documentReducer.taskList[i];
        if (taskElement.isGroupParent) {
          if (taskElement.extraParamMap.autoCuratedJSONFilePath !== "null") {
            let payload = {
              taskId: taskElement.taskId,
              propertyName: properties.autoCuratedJSONFilePath,
            };
            dispatch(getOCROutput(payload));
          }
        }
      }
    }
    dispatch(getDocumentCategoriesAndInstitutionNames());
    // props.updateMetaDataStatus(containerList, false);
  }, []);

  useEffect(() => {
    let autoOcrResponseArrayFromDrawingBoardReducer: Array<IAutoOcrResponse> = getAutoOcrResponseArray();
    console.log("autoOcrResponseArray", autoOcrResponseArrayFromDrawingBoardReducer);
    dispatch(setAutoOcr(autoOcrResponseArrayFromDrawingBoardReducer));
    if (templateListResponse) {
      let templateList: Array<string> = templateListResponse.map(eachTemplate => {
        return eachTemplate.templateName.split('_').join(' ');
      })
      dispatch(setTemplateList(templateList));
    }
  }, [props.drawingBoardReducer.autoOcrResponse, templateListResponse]);

  useEffect(() => {
    const autoOcrResponse: Array<IAutoOcrResponse> = props.multiDocClassifierReducer.autoOcrResponse;
    console.log("autoOcrResponse", autoOcrResponse);

    let buckets: Array<IBucket> = [];
    autoOcrResponse?.forEach((e: any) => {
      buckets.push(...e.buckets)
    });

    let taskData: Array<ITasks> = []
    autoOcrResponse?.forEach((e: any) => taskData.push(...e.tasks));
    let preProcessedData = PreProcessedTreeData(buckets, taskData)

    dispatch(setClassificationData(preProcessedData));
    setAutoOcrResponseArray(autoOcrResponse)
  }, [props.multiDocClassifierReducer.autoOcrResponse])

  const getAutoOcrResponseArray = () => {
    let autoOcrResponseArray: Array<IAutoOcrResponse> = [];
    props.drawingBoardReducer.autoOcrResponse.forEach((eachElement: IAutoOcrResponse) => {
      autoOcrResponseArray.push(eachElement);
    });
    return (autoOcrResponseArray)
  }

  const subLabelExists = (docTypeTemplate: Array<IScreenTemplate> | undefined) => {
    if (docTypeTemplate !== undefined) {
      const templateFields: Array<IScreenTemplateValues> = checkAndGetTemplateValues(docTypeTemplate[0]?.forms?.directories, TemplateTypesEnum.FORM_FIELD);
      let customFields: Array<IScreenTemplateValues> = templateFields.filter((fields: IScreenTemplateValues) => fields.typeOfNode === "custom");
      return customFields.length;
    }
    return -1;
  }

  const getAllPagesInNode = (docTypeNode: any, pages: Array<any>) => {
    const pageList = pages;
    docTypeNode?.children?.forEach((child: any) => {
      if (child.folder === false) {
        pageList.push(child);
      } else {
        getAllPagesInNode(child, pageList);
      }
    });
    return pageList;
  }

  const checkIfEachPageIsClassifiedUnderAtleastOneSubLabel = (docTypeNode: any) => {
    let errorMessage: string = "";
    let pagesList: Array<any> = getAllPagesInNode(docTypeNode, []);
    let pagesNotUnderSubLabel: Array<any> = pagesList.filter((page: any) => page.category === page.parentPath[page.parentPath.length - 1]);
    if (pagesNotUnderSubLabel.length > 0) {
      let pageNumbers: Array<string> = pagesNotUnderSubLabel.map((page: any) => { return page.title });
      errorMessage = docTypeNode.id + ": " + pageNumbers.join(",") + "\n";
    }
    return errorMessage;
  }

  const checkIfAllPagesAreClassified = () => {
    console.log(props.documentReducer.taskList.map((task: any) => { return task.extraParamMap.autoCalculatedPages }))
    let numberOfPagesList: Array<string> = props.documentReducer.taskList.map((task: any) => { return task.extraParamMap.autoCalculatedPages });
    let totalNumberOfPages = numberOfPagesList.reduce((total, numberOfPages) => total + Number(numberOfPages), 0);
    return Object.keys(props.multiDocClassifierReducer.pageNumberCategory).length === totalNumberOfPages;
  }

  const checkForPageGrouping = (resultOfCallBack: nextPreviousCallBack) => {
    let treeView: Array<any> = props.multiDocClassifierReducer.treeView;
    let errorMessage: string = "";
    if (checkIfAllPagesAreClassified()) {
      treeView?.forEach((applicant: any) => {
        let docTypeNodes: Array<any> = applicant.children;
        docTypeNodes?.forEach((docType: any) => {
          let docTypeTemplate: Array<IScreenTemplate> | undefined = props.uiWorkflowReducer.templatesList?.filter((template: IScreenTemplate) => template.templateName === docType.id);
          if (subLabelExists(docTypeTemplate)) {
            errorMessage = errorMessage + checkIfEachPageIsClassifiedUnderAtleastOneSubLabel(docType);
          }
        })
      })
    } else {
      errorMessage = messages['doc.classifier.all.pages.not.classified'];
    }
    resultOfCallBack.isOkToProceed = errorMessage === "";
    resultOfCallBack.errors = errorMessage !== "" ? errorMessage : errorMessage.trim();
    resultOfCallBack.message = errorMessage !== "" ? messages['doc.classifier.page.grouping.failure'] : "";
    return resultOfCallBack;
  }

  const checkForMandatoryDocuments = (requiredDocTypeList: Array<string>, resultOfCallBack: nextPreviousCallBack) => {
    let treeView: Array<any> = props.multiDocClassifierReducer.treeView;
    let isMandatoryDocTypesPresent: boolean = true;
    let errorMessage: string = "";
    // Check mandatory documents are present or not for each applicant
    treeView?.forEach((applicant: any) => {
      let docTypeNodes: Array<any> = applicant.children;
      let docTypeIds: Array<string> = docTypeNodes.map((docTypeNode: any) => { return docTypeNode.id });
      isMandatoryDocTypesPresent = docTypeIds.every((docTypeId: string) => requiredDocTypeList.includes(docTypeId));
    })
    resultOfCallBack.isOkToProceed = isMandatoryDocTypesPresent;
    resultOfCallBack.errors = isMandatoryDocTypesPresent ? errorMessage : messages['doc.classifier.mandatory.documents.absent'] + requiredDocTypeList.toString();
    return resultOfCallBack;
  }

  const validateMandatoryDocuments = () => {
    let resultOfCallBack: nextPreviousCallBack = { isOkToProceed: true, message: "" };
    let formulaeList: Array<any> | undefined = props.uiWorkflowReducer.rules?.formulae;
    if (formulaeList !== undefined) {
      for (let i = 0; i < formulaeList.length; i++) {
        for (const [key, formulae] of Object.entries(formulaeList[i])) {
          switch (key) {
            case 'isMandatory':
              let result: IRuleResult = applyRule(formulae, { "serviceType": "Loan processing", "salaryType": "Normal Salaried" });
              if (result !== undefined && result.isValid) {
                resultOfCallBack = checkForMandatoryDocuments(result.object, resultOfCallBack);
                if (resultOfCallBack.isOkToProceed) {
                  showReactNotification(messages['success'], messages['doc.classifier.mandatory.documents.present'], ReactNotificationType.SUCCESS);
                  resultOfCallBack = checkForPageGrouping(resultOfCallBack);
                  resultOfCallBack.isOkToProceed && showReactNotification(messages['success'], messages['doc.classifier.page.grouping.success'], ReactNotificationType.SUCCESS)
                }
              } else {
                resultOfCallBack = checkForPageGrouping(resultOfCallBack);
                resultOfCallBack.isOkToProceed && showReactNotification(messages['success'], messages['doc.classifier.page.grouping.success'], ReactNotificationType.SUCCESS)
              }
              break;
          }
          if (!resultOfCallBack.isOkToProceed) {
            dispatch(
              SHOW_MODAL(
                ModalType.ALERT_MODAL,
                {
                  title: resultOfCallBack.message.length ? resultOfCallBack.message : messages['alert'],
                  message: resultOfCallBack.errors.trim(),
                  hideModal: () => { dispatch(HIDE_MODAL()); }
                }
              )
            );
            break;
          }
        }
        if (!resultOfCallBack.isOkToProceed) {
          break;
        }
      }
    }
    setIsClassificationValidated(resultOfCallBack.isOkToProceed);
    setIsClassificationSaved(false);
    if (!resultOfCallBack.isOkToProceed) {
      props.notify(NotificationType.CUSTOM_SNACKBAR, {
        message: messages['transaction.tab.error.exists'],
        handleClose: props.hideNotification,
        severity: NotificationSeverity.ERROR
      } as INotifySnackbar)
    } else {
      props.notify(NotificationType.CUSTOM_SNACKBAR, {
        message: messages['transaction.tab.no.errors'],
        handleClose: props.hideNotification,
        severity: NotificationSeverity.SUCCESS
      } as INotifySnackbar)
    }
  }

  const previousButtonDisableStatus = () => {
    let previousScreenInfo = getPreviousScreenNameAndIndex(props.uiWorkflowReducer);
    return previousScreenInfo.screenName === "";
  }

  const nextButtonDisableStatus = () => {
    // let isNextScreenAvailable = props.uiWorkflowReducer.screens.find(screen => screen.screenName === props.uiWorkflowReducer.currentScreenName)?.link.next.length === 0;
    let nextScreenInfo = getNextScreenNameAndIndex(props.uiWorkflowReducer);
    return !(isClassificationValidated && isClassificationSaved && nextScreenInfo.screenName !== "");
  }

  const updateStatus = () => {
    let newState = props?.uiWorkflowReducer?.screens[props.uiWorkflowReducer.currentScreenIndex]?.state?.end;
    props.updateScreenStatus(newState, false);
  }

  const nextButtonOperation = () => {
    updateStatus();
    props.setStateData({
      selectedStatement: 1,
      selectedDocument: 1
    })
    let updatedScreenInfo = getNextScreenNameAndIndex(props.uiWorkflowReducer);
    props.updateCurrentScreenInfo(updatedScreenInfo);
  }

  const handleSaveData = () => {
    let payload = {
      taskId: getParentTaskId(),
      propertyName: properties.autoCuratedJSONFilePath,
      mergedOcrData: autoOcrResponseArray[0],
      resetAndCurateAllData: true,
      isCategorisationRequiredAfterSave: true,
      isExtractionRequiredAfterSave: true,
      isfilterUnchangedTasksNotRequired: true,
    };
    dispatch(
      saveUpdatedBoundingBoxInfo(payload, false, successCallBack)
    );
  }

  const getParentTaskId = () => {
    let task = props.documentReducer.taskList.find((task: any) => task.isParent);
    return task !== undefined ? task.taskId : props.documentReducer.taskList[0].taskId;
  }

  const successCallBack = () => {
    showCustomSnackbar(messages['data.saved.succesfully']);
    setIsClassificationSaved(true);
  }

  const showCustomSnackbar = (message: string) => {
    dispatch(showNotification(NotificationType.CUSTOM_SNACKBAR, {
      message: message,
      handleClose: () => dispatch(hideNotification()),
      severity: NotificationSeverity.SUCCESS
    } as INotifySnackbar))
  }

  return (

    <div className="Classification-Root-Container" id="common-drawing-ui-style-container-id" >
      <Paper className={classNames({
        "col-5": true,
        "is-disabled": props.divDisabled,
        "classification": true
      })}
      >
        <CategoryTab />
        <Categories />
      </Paper>
      <Paper id="rhs-full-screen-toggle-view-checked" className={classNames({
        "col-2": true,
        "is-disabled": props.divDisabled,
        "classification": true
      })}
      >
        <TreeView />
        <ClassifierUtilityButton
          validateData={validateMandatoryDocuments}
          saveData={handleSaveData}
          errorNavigationRequired={false}
          prevButtonDisableStatus={previousButtonDisableStatus()}
          nextButtonDisableStatus={nextButtonDisableStatus()}
          nextButtonOperation={nextButtonOperation}
        />
      </Paper>
    </div>
  );
}

const mapStateToProps = (state: any) => ({
  reducer: state.reducer,
  documentReducer: state.documentReducer,
  drawingBoardReducer: state.drawingBoardReducer,
  uiWorkflowReducer: state.uiWorkflowReducer,
  multiDocClassifierReducer: state.multiDocClassifierReducer
})

const mapDispatchToProps = (dispatch: any) => ({
  notify: (notificationType: NotificationType, params: INotifySnackbar) => {
    dispatch(showNotification(notificationType, params));
  },
  hideNotification: () => {
    dispatch(hideNotification());
  },
  showModal: (modalType: ModalType, params?: any) => {
    dispatch(SHOW_MODAL(modalType, params));
  },
  hideModal: () => dispatch(HIDE_MODAL()),
  setStateData: (payload: object) => {
    dispatch(setStateData(payload))
  },
  updateCurrentScreenInfo: (payload: { screenName: string, screenIndex: number }) => {
    dispatch(updateCurrentScreenInfo(payload))
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Classification)
